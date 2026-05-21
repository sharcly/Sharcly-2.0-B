"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStripeWebhook = exports.getActiveStripeKey = exports.deletePaymentMethod = exports.getPaymentMethods = void 0;
const stripe_1 = __importDefault(require("stripe"));
const payment_service_1 = require("./payment.service");
const prisma_1 = require("../../common/lib/prisma");
const client_1 = require("@prisma/client");
const getPaymentMethods = async (req, res) => {
    try {
        const userId = req.user.id;
        const paymentMethods = await payment_service_1.PaymentService.listPaymentMethods(userId);
        res.status(200).json({ success: true, paymentMethods });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPaymentMethods = getPaymentMethods;
const deletePaymentMethod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        await payment_service_1.PaymentService.deletePaymentMethod(id, userId);
        res.status(200).json({ success: true, message: "Payment method removed" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deletePaymentMethod = deletePaymentMethod;
const getActiveStripeKey = async (req, res) => {
    try {
        const result = await payment_service_1.PaymentService.getActiveGatewayForCheckout();
        res.status(200).json({ success: true, ...result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getActiveStripeKey = getActiveStripeKey;
const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const { gatewayId } = req.query;
    if (!sig) {
        console.error("[STRIPE] Missing stripe-signature header");
        return res.status(400).send("Webhook Error: Missing stripe-signature header");
    }
    let event;
    let activeStripe = payment_service_1.stripe;
    let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    // Resolve custom gateway configuration if specified
    if (gatewayId && gatewayId !== "env-fallback") {
        try {
            const gateway = await prisma_1.prisma.paymentGateway.findUnique({
                where: { id: gatewayId, isActive: true }
            });
            if (gateway) {
                activeStripe = new stripe_1.default(gateway.secretKey, { apiVersion: "2023-10-16" });
                webhookSecret = gateway.webhookSecret || undefined;
            }
            else {
                console.error(`[STRIPE] Active Payment Gateway not found for webhook ID: ${gatewayId}`);
                return res.status(404).send("Webhook Error: Matching Stripe configuration not found.");
            }
        }
        catch (dbErr) {
            console.error(`[STRIPE] DB error fetching gateway details: ${dbErr.message}`);
            return res.status(500).send("Webhook Error: Internal database error");
        }
    }
    if (!webhookSecret) {
        console.error("[STRIPE] Webhook secret is not configured.");
        return res.status(400).send("Webhook Error: Webhook signing secret not found.");
    }
    try {
        // req.body must be the raw Buffer
        event = activeStripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
    catch (err) {
        console.error(`[STRIPE] Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    console.log(`[STRIPE] Event received: ${event.type} (${event.id}) using gateway: ${gatewayId || "env-fallback"}`);
    try {
        switch (event.type) {
            // ─── Payment Intent Events ────────────────────────────────────────────
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                const orderId = paymentIntent.metadata?.orderId;
                if (orderId) {
                    // Increment transaction counter and confirm the order inside a prisma transaction
                    await prisma_1.prisma.$transaction(async (tx) => {
                        await tx.order.update({
                            where: { id: orderId },
                            data: { status: client_1.OrderStatus.CONFIRMED },
                        });
                        if (gatewayId && gatewayId !== "env-fallback") {
                            await tx.paymentGateway.update({
                                where: { id: gatewayId },
                                data: {
                                    paymentCount: { increment: 1 },
                                    totalPayments: { increment: 1 }
                                }
                            });
                        }
                    });
                    console.log(`[STRIPE] Order ${orderId} confirmed and gateway count incremented (payment_intent.succeeded)`);
                }
                break;
            }
            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object;
                const orderId = paymentIntent.metadata?.orderId;
                const errorMessage = paymentIntent.last_payment_error?.message || "Unknown error";
                console.warn(`[STRIPE] Payment failed for order ${orderId ?? "unknown"}: ${errorMessage}`);
                break;
            }
            case "payment_intent.created": {
                const paymentIntent = event.data.object;
                console.log(`[STRIPE] PaymentIntent created: ${paymentIntent.id}, amount: ${paymentIntent.amount}`);
                break;
            }
            case "payment_intent.canceled": {
                const paymentIntent = event.data.object;
                const orderId = paymentIntent.metadata?.orderId;
                console.warn(`[STRIPE] PaymentIntent canceled for order ${orderId ?? "unknown"}`);
                break;
            }
            // ─── Charge Events ────────────────────────────────────────────────────
            case "charge.succeeded": {
                const charge = event.data.object;
                console.log(`[STRIPE] Charge succeeded: ${charge.id}, amount: ${charge.amount}`);
                break;
            }
            case "charge.failed": {
                const charge = event.data.object;
                console.warn(`[STRIPE] Charge failed: ${charge.id}, reason: ${charge.failure_message}`);
                break;
            }
            case "charge.refunded": {
                const charge = event.data.object;
                const orderId = charge.metadata?.orderId;
                console.log(`[STRIPE] Charge refunded: ${charge.id} for order ${orderId ?? "unknown"}`);
                break;
            }
            case "charge.dispute.created": {
                const dispute = event.data.object;
                console.warn(`[STRIPE] Dispute created for charge: ${dispute.charge}, amount: ${dispute.amount}`);
                break;
            }
            // ─── Customer Events ──────────────────────────────────────────────────
            case "customer.created": {
                const customer = event.data.object;
                console.log(`[STRIPE] Customer created: ${customer.id} (${customer.email})`);
                break;
            }
            case "customer.deleted": {
                const customer = event.data.object;
                await prisma_1.prisma.user.updateMany({
                    where: { stripeCustomerId: customer.id },
                    data: { stripeCustomerId: null },
                });
                console.log(`[STRIPE] Customer deleted: ${customer.id} — cleared from DB`);
                break;
            }
            // ─── Payment Method Events ────────────────────────────────────────────
            case "payment_method.attached": {
                const pm = event.data.object;
                console.log(`[STRIPE] Payment method attached: ${pm.id} to customer ${pm.customer}`);
                break;
            }
            case "payment_method.detached": {
                const pm = event.data.object;
                console.log(`[STRIPE] Payment method detached: ${pm.id}`);
                break;
            }
            default:
                console.log(`[STRIPE] Unhandled event type: ${event.type}`);
        }
    }
    catch (handlerError) {
        console.error(`[STRIPE] Error processing event ${event.type}:`, handlerError);
    }
    return res.status(200).json({
        received: true,
        type: event.type,
        id: event.id
    });
};
exports.handleStripeWebhook = handleStripeWebhook;
