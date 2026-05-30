import { Request, Response } from "express";
import { prisma } from "../../common/lib/prisma";
import { OrderService } from "../order/order.service";

export const handleWebhook = async (req: Request, res: Response) => {
  const gateway = req.params.gateway as string;
  const eventPayload = req.body;

  try {
    console.log(`[WEBHOOK] Received webhook event from ${gateway}:`, eventPayload);

    // Standardize event details
    let action = "WEBHOOK_RECEIVED";
    let status = "SUCCESS";
    let details = `Received event from ${gateway}`;
    let orderId: string | null = null;
    let paymentStatus: string | null = null;

    // Gateways event parsing
    switch (gateway.toLowerCase()) {
      case "stripe":
        const stripeEvent = eventPayload.type;
        action = `STRIPE_${stripeEvent.toUpperCase()}`;
        if (stripeEvent === "charge.succeeded") {
          orderId = eventPayload.data?.object?.metadata?.orderId || null;
          paymentStatus = "CONFIRMED";
          details = `Stripe Charge Succeeded: ${eventPayload.data?.object?.id} (Amount: $${eventPayload.data?.object?.amount / 100})`;
        } else if (stripeEvent === "charge.refunded") {
          orderId = eventPayload.data?.object?.metadata?.orderId || null;
          paymentStatus = "CANCELLED";
          details = `Stripe Charge Refunded: ${eventPayload.data?.object?.id}`;
        }
        break;

      case "paypal":
        const paypalEvent = eventPayload.event_type || "PAYMENT.CAPTURE.COMPLETED";
        action = `PAYPAL_${paypalEvent.replace(/\./g, "_")}`;
        if (paypalEvent === "PAYMENT.CAPTURE.COMPLETED") {
          orderId = eventPayload.resource?.custom_id || eventPayload.resource?.invoice_id || null;
          paymentStatus = "CONFIRMED";
          details = `PayPal capture succeeded: ${eventPayload.resource?.id}`;
        } else if (paypalEvent === "PAYMENT.CAPTURE.REFUNDED") {
          orderId = eventPayload.resource?.custom_id || null;
          paymentStatus = "CANCELLED";
          details = `PayPal capture refunded: ${eventPayload.resource?.id}`;
        }
        break;

      case "square":
        const squareEvent = eventPayload.type || "payment.created";
        action = `SQUARE_${squareEvent.replace(/\./g, "_").toUpperCase()}`;
        if (squareEvent === "payment.created" || squareEvent === "payment.updated") {
          orderId = eventPayload.data?.object?.payment?.reference_id || null;
          if (eventPayload.data?.object?.payment?.status === "COMPLETED") {
            paymentStatus = "CONFIRMED";
          }
          details = `Square Payment: ${eventPayload.data?.object?.payment?.id} Status: ${eventPayload.data?.object?.payment?.status}`;
        }
        break;

      case "razorpay":
        const razorEvent = eventPayload.event || "payment.captured";
        action = `RAZORPAY_${razorEvent.replace(/\./g, "_").toUpperCase()}`;
        if (razorEvent === "payment.captured") {
          orderId = eventPayload.payload?.payment?.entity?.notes?.orderId || null;
          paymentStatus = "CONFIRMED";
          details = `Razorpay payment captured: ${eventPayload.payload?.payment?.entity?.id}`;
        }
        break;

      case "braintree":
        action = "BRAINTREE_WEBHOOK";
        if (eventPayload.kind === "subscription_charged_successfully" || eventPayload.kind === "transaction_settled") {
          orderId = eventPayload.transaction?.orderId || null;
          paymentStatus = "CONFIRMED";
          details = `Braintree transaction settled: ${eventPayload.transaction?.id}`;
        }
        break;

      case "authorizenet":
        action = "AUTHORIZENET_WEBHOOK";
        if (eventPayload.eventType === "net.authorize.payment.authcapture.created") {
          orderId = eventPayload.payload?.transaction?.orderId || null;
          paymentStatus = "CONFIRMED";
          details = `Authorize.net capture created: ${eventPayload.payload?.transaction?.id}`;
        }
        break;
    }

    // Process order update if orderId is found
    if (orderId) {
      try {
        if (paymentStatus === "CONFIRMED") {
          await OrderService.updateOrderStatus(orderId, { status: "CONFIRMED" });
          console.log(`[WEBHOOK] Order ${orderId} marked as CONFIRMED via webhook.`);
        } else if (paymentStatus === "CANCELLED") {
          await OrderService.updateOrderStatus(orderId, { status: "CANCELLED" });
          console.log(`[WEBHOOK] Order ${orderId} marked as CANCELLED via webhook.`);
        }
      } catch (e: any) {
        console.warn(`[WEBHOOK] Order status update skipped/failed for ${orderId}:`, e.message);
      }
    }

    // Log the event in IntegrationAuditLog
    await prisma.integrationAuditLog.create({
      data: {
        gatewayName: gateway,
        action,
        status: status as any,
        details
      }
    });

    res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error(`[WEBHOOK ERROR] ${gateway}:`, error);
    
    // Log the failure to audit trail
    try {
      await prisma.integrationAuditLog.create({
        data: {
          gatewayName: gateway,
          action: "WEBHOOK_FAILED",
          status: "FAILED",
          details: `Error processing webhook: ${error.message}`
        }
      });
    } catch (e) {}

    res.status(500).json({ success: false, message: error.message });
  }
};
