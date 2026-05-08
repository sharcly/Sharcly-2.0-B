import { Request, Response } from "express";
import { stripe, PaymentService } from "./payment.service";
import { prisma } from "../../common/lib/prisma";
import { OrderStatus } from "@prisma/client";

export const getPaymentMethods = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const paymentMethods = await PaymentService.listPaymentMethods(userId);
    res.status(200).json({ success: true, paymentMethods });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePaymentMethod = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await PaymentService.deletePaymentMethod(id, userId);
    res.status(200).json({ success: true, message: "Payment method removed" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[STRIPE] Missing stripe-signature header");
    return res.status(400).send("Webhook Error: Missing stripe-signature header");
  }

  let event;

  try {
    // req.body must be the raw Buffer (set by express.raw middleware in index.ts)
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`[STRIPE] Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[STRIPE] Event received: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      // ─── Payment Intent Events ────────────────────────────────────────────
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as any;
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CONFIRMED },
          });
          console.log(`[STRIPE] Order ${orderId} marked as CONFIRMED (payment_intent.succeeded)`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as any;
        const orderId = paymentIntent.metadata?.orderId;
        const errorMessage = paymentIntent.last_payment_error?.message || "Unknown error";
        console.warn(`[STRIPE] Payment failed for order ${orderId ?? "unknown"}: ${errorMessage}`);
        // Optionally mark order as FAILED if your schema supports it
        break;
      }

      case "payment_intent.created": {
        const paymentIntent = event.data.object as any;
        console.log(`[STRIPE] PaymentIntent created: ${paymentIntent.id}, amount: ${paymentIntent.amount}`);
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as any;
        const orderId = paymentIntent.metadata?.orderId;
        console.warn(`[STRIPE] PaymentIntent canceled for order ${orderId ?? "unknown"}`);
        break;
      }

      // ─── Charge Events ────────────────────────────────────────────────────
      case "charge.succeeded": {
        const charge = event.data.object as any;
        console.log(`[STRIPE] Charge succeeded: ${charge.id}, amount: ${charge.amount}`);
        break;
      }

      case "charge.failed": {
        const charge = event.data.object as any;
        console.warn(`[STRIPE] Charge failed: ${charge.id}, reason: ${charge.failure_message}`);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as any;
        const orderId = charge.metadata?.orderId;
        console.log(`[STRIPE] Charge refunded: ${charge.id} for order ${orderId ?? "unknown"}`);
        // Optionally update order to REFUNDED status if your schema supports it
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as any;
        console.warn(`[STRIPE] Dispute created for charge: ${dispute.charge}, amount: ${dispute.amount}`);
        break;
      }

      // ─── Customer Events ──────────────────────────────────────────────────
      case "customer.created": {
        const customer = event.data.object as any;
        console.log(`[STRIPE] Customer created: ${customer.id} (${customer.email})`);
        break;
      }

      case "customer.deleted": {
        const customer = event.data.object as any;
        // Clear stripeCustomerId from our database
        await prisma.user.updateMany({
          where: { stripeCustomerId: customer.id },
          data: { stripeCustomerId: null },
        });
        console.log(`[STRIPE] Customer deleted: ${customer.id} — cleared from DB`);
        break;
      }

      // ─── Payment Method Events ────────────────────────────────────────────
      case "payment_method.attached": {
        const pm = event.data.object as any;
        console.log(`[STRIPE] Payment method attached: ${pm.id} to customer ${pm.customer}`);
        break;
      }

      case "payment_method.detached": {
        const pm = event.data.object as any;
        console.log(`[STRIPE] Payment method detached: ${pm.id}`);
        break;
      }

      // ─── Fallback ─────────────────────────────────────────────────────────
      default:
        console.log(`[STRIPE] Unhandled event type: ${event.type}`);
    }
  } catch (handlerError: any) {
    console.error(`[STRIPE] Error processing event ${event.type}:`, handlerError);
    // Still return 200 to prevent Stripe from retrying — log and monitor separately
  }

  return res.status(200).json({ 
    received: true, 
    type: event.type,
    id: event.id
  });
};
