import { Router } from "express";
import { 
  createCoupon, 
  getCoupons, 
  validateCoupon, 
  deleteCoupon 
} from "./coupon.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import { validate, CreateCouponSchema } from "../../common/middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Business logic for discount coupons
 */

/**
 * @swagger
 * /api/coupons/validate/{code}:
 *   get:
 *     summary: Validate a coupon code
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon is valid
 *       400:
 *         description: Invalid or expired coupon
 */
router.post("/validate", validateCoupon);

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Get all coupons (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of coupons retrieved successfully
 */
router.get("/", authenticate, authorize("coupons.manage"), getCoupons);

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Create a new coupon (Admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *               discountType: { type: string, enum: [PERCENTAGE, FIXED] }
 *               discountValue: { type: number }
 *               expiryDate: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Coupon created successfully
 */
router.post("/", authenticate, authorize("coupons.manage"), validate(CreateCouponSchema), createCoupon);

/**
 * @swagger
 * /api/coupons/{id}:
 *   delete:
 *     summary: Delete a coupon (Admin only)
 *     tags: [Coupons]
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
 *         description: Coupon deleted successfully
 */
router.delete("/:id", authenticate, authorize("coupons.manage"), deleteCoupon);

export default router;
