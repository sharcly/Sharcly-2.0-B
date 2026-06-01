"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadInvoice = exports.updateOrderStatus = exports.getOrderById = exports.previewOrder = exports.getAllOrders = exports.getMyOrders = exports.createOrder = void 0;
const order_service_1 = require("./order.service");
const invoice_service_1 = require("./invoice.service");
const payment_service_1 = require("../payment/payment.service");
const factory_1 = require("../payment/providers/factory");
const prisma_1 = require("../../common/lib/prisma");
const client_1 = require("@prisma/client");
const createOrder = async (req, res) => {
    try {
        const orderData = req.body;
        const userId = req.user?.id || undefined;
        // Require email for guest orders
        const email = req.user?.email || req.body.email;
        if (!email) {
            return res.status(400).json({ message: "Email is required to place an order" });
        }
        const order = await order_service_1.OrderService.createOrder(userId, email, orderData);
        // Dynamic rotation and payment authorization for online card payments
        if (orderData.paymentMethod === "online") {
            let activeGateway;
            if (orderData.gatewayId) {
                const gw = await prisma_1.prisma.paymentGateway.findFirst({
                    where: { id: orderData.gatewayId, isActive: true }
                });
                if (gw) {
                    activeGateway = {
                        publishableKey: gw.publishableKey || "",
                        gatewayId: gw.id,
                        gatewayName: gw.provider
                    };
                }
            }
            if (!activeGateway) {
                activeGateway = await payment_service_1.PaymentService.getActiveGatewayForCheckout();
            }
            if (activeGateway.gatewayName === "stripe") {
                // Create Stripe payment intent
                const paymentIntent = await payment_service_1.PaymentService.createPaymentIntent(Number(order.totalAmount), "usd", { orderId: order.id }, activeGateway.gatewayId);
                // Increment counts on the Stripe payment gateway
                if (activeGateway.gatewayId !== "env-fallback") {
                    await prisma_1.prisma.paymentGateway.update({
                        where: { id: activeGateway.gatewayId },
                        data: {
                            paymentCount: { increment: 1 },
                            totalPayments: { increment: 1 }
                        }
                    });
                }
                return res.status(201).json({
                    success: true,
                    order,
                    clientSecret: paymentIntent.client_secret
                });
            }
            else {
                // Direct credit card charging via non-Stripe providers
                const provider = factory_1.PaymentProviderFactory.getProvider(activeGateway.gatewayName);
                const chargeResult = await provider.chargeCard(Number(order.totalAmount), "usd", orderData.cardData, order.id);
                // Update order status to CONFIRMED on successful charge
                const confirmedOrder = await prisma_1.prisma.order.update({
                    where: { id: order.id },
                    data: { status: client_1.OrderStatus.CONFIRMED }
                });
                // Increment counts on the non-Stripe payment gateway
                if (activeGateway.gatewayId !== "env-fallback") {
                    await prisma_1.prisma.paymentGateway.update({
                        where: { id: activeGateway.gatewayId },
                        data: {
                            paymentCount: { increment: 1 },
                            totalPayments: { increment: 1 }
                        }
                    });
                }
                return res.status(201).json({
                    success: true,
                    order: confirmedOrder,
                    chargeResult
                });
            }
        }
        res.status(201).json({ success: true, order });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Order placement failed" });
    }
};
exports.createOrder = createOrder;
const getMyOrders = async (req, res) => {
    try {
        const orders = await order_service_1.OrderService.getMyOrders(req.user.id);
        res.status(200).json({ success: true, orders });
    }
    catch (error) {
        console.error("Fetch orders error:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};
exports.getMyOrders = getMyOrders;
const getAllOrders = async (req, res) => {
    try {
        const orders = await order_service_1.OrderService.getAllOrders();
        res.status(200).json({ success: true, orders });
    }
    catch (error) {
        console.error("Fetch all orders error:", error);
        res.status(500).json({ message: "Failed to fetch all orders" });
    }
};
exports.getAllOrders = getAllOrders;
const previewOrder = async (req, res) => {
    try {
        const summary = await order_service_1.OrderService.previewOrder(req.body);
        res.status(200).json({ success: true, summary });
    }
    catch (error) {
        console.error("Order preview error:", error);
        res.status(400).json({ message: error.message || "Failed to preview order" });
    }
};
exports.previewOrder = previewOrder;
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await order_service_1.OrderService.getOrderById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // IDOR fix: only allow owner or admin/manager to view order
        const isAdmin = ["admin", "manager"].includes(req.user?.userRole?.slug);
        if (!isAdmin && order.userId !== req.user?.id) {
            return res.status(403).json({ message: "Access denied" });
        }
        res.status(200).json({ success: true, order });
    }
    catch (error) {
        console.error("Fetch order details error:", error);
        res.status(500).json({ message: "Failed to fetch order details" });
    }
};
exports.getOrderById = getOrderById;
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await order_service_1.OrderService.updateOrderStatus(id, req.body);
        res.status(200).json({ success: true, order });
    }
    catch (error) {
        console.error("Order status update error:", error);
        res.status(500).json({ message: "Failed to update order status" });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const downloadInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await order_service_1.OrderService.getOrderById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // IDOR fix: only allow owner or admin/manager to view order
        const isAdmin = ["admin", "manager"].includes(req.user?.userRole?.slug);
        if (!isAdmin && order.userId !== req.user?.id) {
            return res.status(403).json({ message: "Access denied" });
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=invoice-${id.slice(0, 8)}.pdf`);
        await invoice_service_1.InvoiceService.generateInvoice(order, res);
    }
    catch (error) {
        console.error("Invoice generation error:", error);
        res.status(500).json({ message: "Failed to generate invoice" });
    }
};
exports.downloadInvoice = downloadInvoice;
