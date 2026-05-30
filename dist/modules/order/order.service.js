"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const prisma_1 = require("../../common/lib/prisma");
const client_1 = require("@prisma/client");
const email_service_1 = require("../auth/email.service");
const klaviyo_service_1 = require("../marketing/klaviyo.service");
const seo_service_1 = require("../seo/seo.service");
const payment_service_1 = require("../payment/payment.service");
const crypto_1 = __importDefault(require("crypto"));
class OrderService {
    static async createOrder(userId, email, orderData) {
        const { items, shippingAddress, billingAddress, couponCode, paymentMethod } = orderData;
        // Secure user identification
        let finalUserId = userId;
        if (!finalUserId) {
            let guestUser = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (!guestUser) {
                // Explicitly assign 'user' role to guest accounts
                const userRole = await prisma_1.prisma.role.findUnique({ where: { slug: "user" } });
                guestUser = await prisma_1.prisma.user.create({
                    data: {
                        email,
                        password: `guest_${crypto_1.default.randomBytes(16).toString("hex")}`,
                        name: "Guest Shopper",
                        ...(userRole ? { roleId: userRole.id } : {})
                    }
                });
            }
            finalUserId = guestUser.id;
        }
        // Calculate total and validate stock
        let totalAmount = 0;
        const orderItems = [];
        for (const item of items) {
            let product = await prisma_1.prisma.product.findUnique({ where: { id: item.productId } });
            let variant = null;
            if (!product) {
                variant = await prisma_1.prisma.productVariant.findUnique({
                    where: { id: item.productId },
                    include: { product: true }
                });
                if (variant) {
                    product = variant.product;
                }
                else {
                    // Don't expose internal product IDs in error messages
                    throw new Error("One or more items in your cart are unavailable. Please refresh and try again.");
                }
            }
            const targetStock = variant ? variant.inventoryQuantity : product.stock;
            if (targetStock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}`);
            }
            const price = variant ? Number(variant.price) : Number(product.price);
            totalAmount += price * item.quantity;
            orderItems.push({
                productId: product.id,
                variantId: variant ? variant.id : undefined,
                quantity: item.quantity,
                price: price
            });
        }
        // Validate coupon code BEFORE transaction (read-only check)
        let couponId = undefined;
        let couponDiscountAmount = 0;
        if (couponCode) {
            const coupon = await prisma_1.prisma.coupon.findUnique({ where: { code: couponCode } });
            if (coupon && coupon.expiryDate > new Date() && coupon.usedCount < coupon.usageLimit) {
                if (coupon.discountType === "PERCENTAGE") {
                    couponDiscountAmount = (totalAmount * Number(coupon.discount)) / 100;
                }
                else {
                    couponDiscountAmount = Number(coupon.discount);
                }
                couponId = coupon.id;
            }
        }
        // Apply coupon discount to total
        totalAmount = Math.max(0, totalAmount - couponDiscountAmount);
        // Add Tax and Shipping from settings
        const settings = await prisma_1.prisma.storeSettings.findFirst();
        let taxAmount = 0;
        let shippingCost = 0;
        if (settings) {
            const taxRate = Number(settings.taxRate) || 0;
            taxAmount = (totalAmount * taxRate) / 100;
            const shippingCharge = Number(settings.shippingCharge) || 0;
            const freeShippingThreshold = Number(settings.freeShippingThreshold) || 0;
            shippingCost = (freeShippingThreshold > 0 && totalAmount >= freeShippingThreshold) ? 0 : shippingCharge;
        }
        totalAmount += taxAmount + shippingCost;
        // Create order, update stock, and increment coupon usage all in ONE atomic transaction
        const order = await prisma_1.prisma.$transaction(async (tx) => {
            // If coupon is used, re-validate inside transaction to prevent race conditions
            if (couponId) {
                const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
                if (!coupon || coupon.usedCount >= coupon.usageLimit || coupon.expiryDate <= new Date()) {
                    throw new Error("Coupon is no longer valid or has reached its usage limit");
                }
                await tx.coupon.update({
                    where: { id: couponId },
                    data: { usedCount: { increment: 1 } }
                });
            }
            const newOrder = await tx.order.create({
                data: {
                    userId: finalUserId,
                    totalAmount,
                    taxAmount,
                    shippingAmount: shippingCost,
                    address: shippingAddress,
                    shippingAddress,
                    billingAddress: billingAddress || shippingAddress,
                    paymentMethod,
                    status: client_1.OrderStatus.PENDING,
                    couponId,
                    items: {
                        create: orderItems.map(oi => ({
                            productId: oi.productId,
                            quantity: oi.quantity,
                            price: oi.price
                        }))
                    }
                },
                include: { items: true }
            });
            // Update stock atomically
            for (const item of orderItems) {
                if (item.variantId) {
                    await tx.productVariant.update({
                        where: { id: item.variantId },
                        data: { inventoryQuantity: { decrement: item.quantity } }
                    });
                }
                else {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    });
                }
            }
            return newOrder;
        });
        // Klaviyo Tracking
        try {
            const seoSettings = await seo_service_1.SeoService.getGlobalSettings();
            if (seoSettings?.klaviyoPrivateKey) {
                klaviyo_service_1.KlaviyoService.init(seoSettings.klaviyoPrivateKey);
                await klaviyo_service_1.KlaviyoService.trackEvent(email, "Placed Order", {
                    "$value": Number(order.totalAmount),
                    "OrderID": order.id,
                    "ItemNames": order.items.map((i) => i.productId), // ideally fetch names
                    "ShippingAddress": order.shippingAddress,
                    "BillingAddress": order.billingAddress,
                });
            }
        }
        catch (kErr) {
            console.warn("Klaviyo Order Tracking Failed:", kErr);
        }
        // 5. Handle Stripe Payment Intent if online
        let clientSecret = undefined;
        if (paymentMethod === 'online') {
            try {
                const paymentIntent = await payment_service_1.PaymentService.createPaymentIntent(Number(order.totalAmount), "usd", { orderId: order.id, userId: finalUserId });
                clientSecret = paymentIntent.client_secret || undefined;
            }
            catch (pErr) {
                console.error("Stripe Payment Intent Creation Failed:", pErr);
                throw new Error(`Failed to initialize payment: ${pErr.message || "Stripe error"}`);
            }
        }
        // Send Email Confirmation only for non-online (e.g. cod) orders since online orders are still pending payment
        if (paymentMethod !== 'online') {
            try {
                await (0, email_service_1.sendOrderConfirmation)(email, order);
            }
            catch (eErr) {
                console.warn("Email Confirmation Failed:", eErr);
            }
        }
        return { order, clientSecret };
    }
    static async getMyOrders(userId) {
        const orders = await prisma_1.prisma.order.findMany({
            where: { userId },
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: "desc" }
        });
        const settings = await prisma_1.prisma.storeSettings.findFirst();
        return orders.map(order => this.applyLegacyFallback(order, settings));
    }
    static async getAllOrders() {
        const orders = await prisma_1.prisma.order.findMany({
            include: {
                user: { select: { name: true, email: true } },
                items: { include: { product: true } }
            },
            orderBy: { createdAt: "desc" }
        });
        const settings = await prisma_1.prisma.storeSettings.findFirst();
        return orders.map(order => this.applyLegacyFallback(order, settings));
    }
    static async getOrderById(id) {
        const order = await prisma_1.prisma.order.findUnique({
            where: { id },
            include: {
                user: { select: { name: true, email: true } },
                items: { include: { product: true } },
                coupon: true
            }
        });
        if (!order)
            return null;
        const settings = await prisma_1.prisma.storeSettings.findFirst();
        return this.applyLegacyFallback(order, settings);
    }
    static applyLegacyFallback(order, settings) {
        if (!order)
            return order;
        const itemsSubtotal = order.items.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
        const total = Number(order.totalAmount);
        const recordedTax = Number(order.taxAmount || 0);
        const recordedShipping = Number(order.shippingAmount || 0);
        if (recordedTax === 0 && recordedShipping === 0 && total > itemsSubtotal && settings) {
            const taxRate = Number(settings.taxRate) || 0;
            const inferredTax = (itemsSubtotal * taxRate) / 100;
            const inferredShipping = Math.max(0, total - itemsSubtotal - inferredTax);
            return {
                ...order,
                taxAmount: inferredTax,
                shippingAmount: inferredShipping
            };
        }
        return order;
    }
    static async updateOrderStatus(id, updateData) {
        const { status, trackingNumber, carrier, estimatedDelivery, notes } = updateData;
        const updatedOrder = await prisma_1.prisma.order.update({
            where: { id },
            data: {
                status: status,
                trackingNumber: trackingNumber || undefined,
                carrier: carrier || undefined,
                estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
                notes: notes || undefined
            },
            include: {
                user: { select: { email: true, name: true } },
                items: { include: { product: true } }
            }
        });
        // Send Status Update Email
        try {
            const { sendOrderStatusUpdate } = require("../auth/email.service");
            await sendOrderStatusUpdate(updatedOrder.user.email, updatedOrder);
        }
        catch (eErr) {
            console.warn("Status Update Email Failed:", eErr);
        }
        return updatedOrder;
    }
    static async cancelOrder(id, userId, cancelReason) {
        const order = await prisma_1.prisma.order.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!order)
            throw new Error("Order not found");
        if (order.userId !== userId)
            throw new Error("Access denied");
        if (![client_1.OrderStatus.PENDING, client_1.OrderStatus.CONFIRMED].includes(order.status)) {
            throw new Error(`Order cannot be cancelled because it is already ${order.status.toLowerCase()}.`);
        }
        return await prisma_1.prisma.$transaction(async (tx) => {
            // 0. Record History
            await tx.orderStatusHistory.create({
                data: {
                    orderId: id,
                    status: client_1.OrderStatus.CANCELLED
                }
            });
            // 1. Update Order Status
            const updatedOrder = await tx.order.update({
                where: { id },
                data: {
                    status: client_1.OrderStatus.CANCELLED,
                    cancelReason
                },
                include: { statusHistory: { orderBy: { createdAt: 'asc' } } }
            });
            // 2. Restore stock
            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } }
                });
            }
            // 3. Handle Refund if applicable
            if (order.paymentMethod === 'online' && order.status === client_1.OrderStatus.CONFIRMED) {
                try {
                    await payment_service_1.PaymentService.refundOrder(id);
                }
                catch (rErr) {
                    console.error(`[CANCEL_ORDER] Refund failed for order ${id}:`, rErr.message);
                    throw rErr;
                }
            }
            // 4. Send Cancellation Email
            try {
                const { sendOrderStatusUpdate } = require("../auth/email.service");
                const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
                if (user) {
                    await sendOrderStatusUpdate(user.email, updatedOrder);
                }
            }
            catch (eErr) {
                console.warn("Cancellation Email Failed:", eErr);
            }
            return updatedOrder;
        });
    }
    static async handleFailedPaymentCleanup(orderId) {
        const order = await prisma_1.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true, user: { select: { email: true } } }
        });
        if (!order)
            return;
        // Only cleanup if the order is still PENDING and was placed online
        if (order.status !== client_1.OrderStatus.PENDING || order.paymentMethod !== 'online') {
            return;
        }
        const updatedOrder = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Revert coupon usage if coupon was applied
            if (order.couponId) {
                await tx.coupon.update({
                    where: { id: order.couponId },
                    data: { usedCount: { decrement: 1 } }
                });
            }
            // 2. Revert inventory stock
            for (const item of order.items) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                }
            }
            // 3. Add to OrderStatusHistory
            await tx.orderStatusHistory.create({
                data: {
                    orderId,
                    status: client_1.OrderStatus.CANCELLED
                }
            });
            // 4. Update the order status to CANCELLED and set reason
            return await tx.order.update({
                where: { id: orderId },
                data: {
                    status: client_1.OrderStatus.CANCELLED,
                    cancelReason: "payment_failed"
                }
            });
        });
        // 5. Send Payment Failed email to the customer with branding!
        try {
            const email = order.user?.email || order.email;
            if (email) {
                const { sendPaymentFailedEmail } = require("../auth/email.service");
                await sendPaymentFailedEmail(email, updatedOrder);
            }
        }
        catch (emailErr) {
            console.warn("Payment Failed Email failed to send:", emailErr);
        }
    }
}
exports.OrderService = OrderService;
