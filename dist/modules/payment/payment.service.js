"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const prisma_1 = require("../../common/lib/prisma");
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-01-27-acacia",
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
}
exports.PaymentService = PaymentService;
