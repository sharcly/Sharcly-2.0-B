"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = exports.downloadInvoice = exports.updateOrderStatus = exports.getOrderById = exports.getAllOrders = exports.getMyOrders = exports.previewOrder = exports.createOrder = void 0;
const order_service_1 = require("./order.service");
const invoice_service_1 = require("./invoice.service");
const createOrder = async (req, res) => {
    try {
        const orderData = req.body;
        const userId = req.user?.id || undefined;
        // Require email for guest orders
        const email = req.user?.email || req.body.email;
        if (!email) {
            return res.status(400).json({ message: "Email is required to place an order" });
        }
        const { order, clientSecret } = await order_service_1.OrderService.createOrder(userId, email, orderData);
        res.status(201).json({ success: true, order, clientSecret });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Order placement failed" });
    }
};
exports.createOrder = createOrder;
const previewOrder = async (req, res) => {
    try {
        const summary = await order_service_1.OrderService.previewOrder(req.body);
        res.status(200).json({ success: true, summary });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Calculation failed" });
    }
};
exports.previewOrder = previewOrder;
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
        res.status(500).json({
            message: "Failed to fetch all orders",
            error: error.message
        });
    }
};
exports.getAllOrders = getAllOrders;
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await order_service_1.OrderService.getOrderById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // IDOR fix: only allow owner or admin/manager to view order
        const isAdmin = ["admin", "super_admin", "manager"].includes(req.user?.userRole?.slug);
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
        const isAdmin = ["admin", "super_admin", "manager"].includes(req.user?.userRole?.slug);
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
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ message: "Cancellation reason is required" });
        }
        const order = await order_service_1.OrderService.cancelOrder(id, req.user.id, reason);
        res.status(200).json({ success: true, order });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Failed to cancel order" });
    }
};
exports.cancelOrder = cancelOrder;
