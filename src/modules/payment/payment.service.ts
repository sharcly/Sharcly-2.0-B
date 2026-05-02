import Stripe from "stripe";
import { prisma } from "../../common/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27-acacia" as any,
});

export class PaymentService {
  static async getOrCreateCustomer(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true }
    });

    if (!user) throw new Error("User not found");

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
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

  static async listPaymentMethods(userId: string) {
    const customerId = await this.getOrCreateCustomer(userId);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
      is_default: false // Stripe doesn't have a direct "default" flag on PMs in the same way, but we can infer or use customer defaults
    }));
  }

  static async deletePaymentMethod(pmId: string, userId: string) {
    // Verify ownership indirectly by checking if it belongs to the customer
    const customerId = await this.getOrCreateCustomer(userId);
    const pm = await stripe.paymentMethods.retrieve(pmId);
    
    if (pm.customer !== customerId) {
      throw new Error("Payment method not found");
    }

    return await stripe.paymentMethods.detach(pmId);
  }
}
