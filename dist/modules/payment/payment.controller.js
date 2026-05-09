"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStripeWebhook = exports.deletePaymentMethod = exports.getPaymentMethods = void 0;
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
const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = payment_service_1.stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error(`[STRIPE] Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // Handle the event
    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.orderId;
        if (orderId) {
            try {
                await prisma_1.prisma.order.update({
                    where: { id: orderId },
                    data: { status: client_1.OrderStatus.CONFIRMED } // Mark as confirmed/paid
                });
                console.log(`[STRIPE] Order ${orderId} marked as PAID`);
            }
            catch (error) {
                console.error(`[STRIPE] Failed to update order ${orderId}:`, error);
            }
        }
    }
    res.json({ received: true });
};
exports.handleStripeWebhook = handleStripeWebhook;
