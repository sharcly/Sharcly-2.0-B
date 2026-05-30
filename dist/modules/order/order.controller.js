"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = exports.getOrderById = exports.getAllOrders = exports.getMyOrders = exports.createOrder = void 0;
const order_service_1 = require("./order.service");
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
        res.status(500).json({ message: "Failed to fetch all orders" });
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
        const isAdmin = ["admin", "manager"].includes(req.user?.userRole?.slug);
        if (!isAdmin && order.userId !== req.user?.id) {
            return res.status(403).json({ message: "Access denied" });
        }
        res.status(200).json({ success: true, order });
    }
    catch (error) {
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
        res.status(500).json({ message: "Failed to update order status" });
    }
};
exports.updateOrderStatus = updateOrderStatus;
