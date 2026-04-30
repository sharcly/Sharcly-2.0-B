"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("./order.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Customer orders and fulfillment
 */
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items: { type: array, items: { type: object } }
 *               shippingAddress: { type: object }
 *     responses:
 *       201:
 *         description: Order created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/", auth_middleware_1.authenticate, order_controller_1.createOrder);
/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's orders retrieved successfully
 */
router.get("/my-orders", auth_middleware_1.authenticate, order_controller_1.getMyOrders);
/**
 * @swagger
 * /api/orders/all:
 *   get:
 *     summary: Get all orders (Admin/Manager only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All orders retrieved successfully
 */
router.get("/all", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("orders.view"), order_controller_1.getAllOrders);
/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get("/:id", auth_middleware_1.authenticate, order_controller_1.getOrderById);
/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [PENDING, ACCEPTED, SHIPPED, DELIVERED, CANCELLED] }
 *               trackingNumber: { type: string }
 *               carrier: { type: string }
 *               estimatedDelivery: { type: string, format: date-time }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.patch("/:id/status", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("orders.manage"), order_controller_1.updateOrderStatus);
exports.default = router;
