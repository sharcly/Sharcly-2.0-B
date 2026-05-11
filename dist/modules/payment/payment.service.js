"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const prisma_1 = require("../../common/lib/prisma");
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
});
class PaymentService {
    static async getOrCreateCustomer(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, stripeCustomerId: true }
        });
        if (!user)
            throw new Error("User not found");
        if (user.stripeCustomerId) {
            return user.stripeCustomerId;
        }
        const customer = await exports.stripe.customers.create({
            email: user.email,
            name: user.name || undefined,
            metadata: { userId: user.id }
        });
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customer.id }
        });
        return customer.id;
    }
    static async listPaymentMethods(userId) {
        const customerId = await this.getOrCreateCustomer(userId);
        const paymentMethods = await exports.stripe.paymentMethods.list({
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
    static async deletePaymentMethod(pmId, userId) {
        // Verify ownership indirectly by checking if it belongs to the customer
        const customerId = await this.getOrCreateCustomer(userId);
        const pm = await exports.stripe.paymentMethods.retrieve(pmId);
        if (pm.customer !== customerId) {
            throw new Error("Payment method not found");
        }
        return await exports.stripe.paymentMethods.detach(pmId);
    }
    static async createPaymentIntent(amount, currency = "usd", metadata = {}) {
        return await exports.stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects cents
            currency,
            metadata,
        });
    }
    static async refundOrder(orderId) {
        try {
            // Search for payment intent associated with this order
            const paymentIntents = await exports.stripe.paymentIntents.search({
                query: `metadata['orderId']:'${orderId}'`,
            });
            if (paymentIntents.data.length === 0) {
                console.warn(`[STRIPE] No payment intent found for order ${orderId}. Skipping refund.`);
                return;
            }
            const pi = paymentIntents.data[0];
            // Only refund if payment succeeded
            if (pi.status !== "succeeded") {
                console.warn(`[STRIPE] Payment intent for order ${orderId} is in status ${pi.status}. Skipping refund.`);
                return;
            }
            // Check if already refunded (optional, Stripe will error if already refunded usually)
            const refund = await exports.stripe.refunds.create({
                payment_intent: pi.id,
                reason: "requested_by_customer",
                metadata: { orderId }
            });
            console.log(`[STRIPE] Refund initiated for order ${orderId}: ${refund.id}`);
            return refund;
        }
        catch (error) {
            console.error(`[STRIPE] Refund failed for order ${orderId}:`, error.message);
            // We don't necessarily want to crash the whole cancellation if refund fails, 
            // but we should log it prominently.
            throw new Error(`Stripe Refund Failed: ${error.message}`);
        }
    }
}
exports.PaymentService = PaymentService;
