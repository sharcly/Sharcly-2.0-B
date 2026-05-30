import { Router } from "express";
import { 
  createOrder, 
  getMyOrders, 
  getAllOrders, 
  getOrderById,
  updateOrderStatus,
  downloadInvoice
} from "./order.controller";
import { authenticate, authorize, optionalAuth } from "../../common/middlewares/auth.middleware";
import { validate, CreateOrderSchema, UpdateOrderStatusSchema } from "../../common/middlewares/validate.middleware";

const router = Router();

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
router.post("/", optionalAuth, validate(CreateOrderSchema), createOrder);

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
router.get("/my-orders", authenticate, getMyOrders);

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
router.get("/all", authenticate, authorize("orders.view"), getAllOrders);

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
router.get("/:id", authenticate, getOrderById);

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
router.patch("/:id/status", authenticate, authorize("orders.manage"), validate(UpdateOrderStatusSchema), updateOrderStatus);

/**
 * @swagger
 * /api/orders/{id}/invoice:
 *   get:
 *     summary: Download order invoice PDF
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/invoice", authenticate, downloadInvoice);

export default router;
