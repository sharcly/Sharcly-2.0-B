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
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`[STRIPE] Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as any;
    const orderId = paymentIntent.metadata.orderId;

    if (orderId) {
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.COMPLETED } // Mark as completed or paid
        });
        console.log(`[STRIPE] Order ${orderId} marked as PAID`);
      } catch (error) {
        console.error(`[STRIPE] Failed to update order ${orderId}:`, error);
      }
    }
  }

  res.json({ received: true });
};
