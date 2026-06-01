import Stripe from "stripe";
import { prisma } from "../../common/lib/prisma";

// Legacy fallback client to prevent compile errors
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_fallback", {
  apiVersion: "2023-10-16" as any,
});

export class PaymentService {
  /**
   * Factory method to load a Stripe instance dynamically
   * based on the provided gateway ID or the active rotation cycle.
   */
  static async getStripeClient(gatewayId?: string): Promise<{ stripe: any; gatewayId: string }> {
    if (gatewayId && gatewayId !== "env-fallback") {
      const gateway = await prisma.paymentGateway.findUnique({
        where: { id: gatewayId }
      });
      if (gateway && gateway.isActive) {
        return {
          stripe: new Stripe(gateway.secretKey, { apiVersion: "2023-10-16" as any }),
          gatewayId: gateway.id
        };
      }
    }

    // Resolve active Stripe gateway from database using cycle rotation
    const gateways = await prisma.paymentGateway.findMany({
      where: { provider: "stripe", isActive: true },
      orderBy: { createdAt: "asc" }
    });

    if (gateways.length === 0) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("Stripe secret key not configured in environment or database.");
      }
      return {
        stripe: new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" as any }),
        gatewayId: "env-fallback"
      };
    }

    // Determine target gateway based on total payments count across all active gateways
    const totalCycles = gateways.reduce((acc, g) => acc + g.totalPayments, 0);
    const limit = gateways[0].rotationLimit || 10;
    const activeIndex = Math.floor(totalCycles / limit) % gateways.length;
    const selectedGateway = gateways[activeIndex];

    return {
      stripe: new Stripe(selectedGateway.secretKey, { apiVersion: "2023-10-16" as any }),
      gatewayId: selectedGateway.id
    };
  }

  /**
   * Resolves the active Publishable Key and Gateway ID for Stripe checkout mount
   */
  static async getActiveGatewayForCheckout(): Promise<{ publishableKey: string; gatewayId: string; gatewayName: string }> {
    const gateways = await prisma.paymentGateway.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" }
    });

    if (gateways.length === 0) {
      return {
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder",
        gatewayId: "env-fallback",
        gatewayName: "stripe"
      };
    }

    const totalCycles = gateways.reduce((acc, g) => acc + g.totalPayments, 0);
    const limit = gateways[0].rotationLimit || 10;
    const activeIndex = Math.floor(totalCycles / limit) % gateways.length;
    const selectedGateway = gateways[activeIndex];

    return {
      publishableKey: selectedGateway.publishableKey || "",
      gatewayId: selectedGateway.id,
      gatewayName: selectedGateway.provider
    };
  }

  static async getOrCreateCustomer(userId: string, gatewayId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true }
    });

    if (!user) throw new Error("User not found");

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const { stripe: activeStripe } = await this.getStripeClient(gatewayId);
    const customer = await activeStripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: user.id }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id }
    });

    return customer.id;
  }

  static async listPaymentMethods(userId: string, gatewayId?: string) {
    const customerId = await this.getOrCreateCustomer(userId, gatewayId);
    const { stripe: activeStripe } = await this.getStripeClient(gatewayId);
    
    const paymentMethods = await activeStripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return paymentMethods.data.map((pm: any) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
      is_default: false
    }));
  }

  static async deletePaymentMethod(pmId: string, userId: string, gatewayId?: string) {
    const customerId = await this.getOrCreateCustomer(userId, gatewayId);
    const { stripe: activeStripe } = await this.getStripeClient(gatewayId);
    
    const pm = await activeStripe.paymentMethods.retrieve(pmId);
    if (pm.customer !== customerId) {
      throw new Error("Payment method not found");
    }

    return await activeStripe.paymentMethods.detach(pmId);
  }

  static async createPaymentIntent(amount: number, currency: string = "usd", metadata: any = {}, gatewayId?: string) {
    const { stripe: activeStripe } = await this.getStripeClient(gatewayId);
    return await activeStripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency,
      metadata,
    });
  }

  static async refundOrder(orderId: string, gatewayId?: string) {
    try {
      const { stripe: activeStripe } = await this.getStripeClient(gatewayId);
      
      const paymentIntents = await activeStripe.paymentIntents.search({
        query: `metadata['orderId']:'${orderId}'`,
      });

      if (paymentIntents.data.length === 0) {
        console.warn(`[STRIPE] No payment intent found for order ${orderId}. Skipping refund.`);
        return;
      }

      const pi = paymentIntents.data[0];
      if (pi.status !== "succeeded") {
        console.warn(`[STRIPE] Payment intent for order ${orderId} is in status ${pi.status}. Skipping refund.`);
        return;
      }

      const refund = await activeStripe.refunds.create({
        payment_intent: pi.id,
        reason: "requested_by_customer",
        metadata: { orderId }
      });

      console.log(`[STRIPE] Refund initiated for order ${orderId}: ${refund.id}`);
      return refund;
    } catch (error: any) {
      console.error(`[STRIPE] Refund failed for order ${orderId}:`, error.message);
      throw new Error(`Stripe Refund Failed: ${error.message}`);
    }
  }
}
