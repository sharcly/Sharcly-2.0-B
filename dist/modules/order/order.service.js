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
        // Send Email Confirmation
        try {
            await (0, email_service_1.sendOrderConfirmation)(email, order);
        }
        catch (eErr) {
            console.warn("Email Confirmation Failed:", eErr);
        }
        return order;
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
    static async previewOrder(orderData) {
        const { items, couponCode } = orderData;
        let subtotal = 0;
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
                    throw new Error("One or more items in your cart are unavailable.");
                }
            }
            const price = variant ? Number(variant.price) : Number(product.price);
            subtotal += price * item.quantity;
        }
        let discountAmount = 0;
        if (couponCode) {
            const coupon = await prisma_1.prisma.coupon.findUnique({ where: { code: couponCode } });
            if (coupon && coupon.expiryDate > new Date() && coupon.usedCount < coupon.usageLimit) {
                if (coupon.discountType === "PERCENTAGE") {
                    discountAmount = (subtotal * Number(coupon.discount)) / 100;
                }
                else {
                    discountAmount = Number(coupon.discount);
                }
            }
        }
        const discountedSubtotal = Math.max(0, subtotal - discountAmount);
        const settings = await prisma_1.prisma.storeSettings.findFirst();
        let taxAmount = 0;
        let shippingAmount = 0;
        if (settings) {
            const taxRate = Number(settings.taxRate) || 0;
            taxAmount = (discountedSubtotal * taxRate) / 100;
            const shippingCharge = Number(settings.shippingCharge) || 0;
            const freeShippingThreshold = Number(settings.freeShippingThreshold) || 0;
            shippingAmount = (freeShippingThreshold > 0 && discountedSubtotal >= freeShippingThreshold) ? 0 : shippingCharge;
        }
        const totalAmount = discountedSubtotal + taxAmount + shippingAmount;
        return {
            taxAmount,
            shippingAmount,
            totalAmount,
            discountAmount
        };
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
}
exports.OrderService = OrderService;
