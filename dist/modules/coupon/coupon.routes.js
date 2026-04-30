"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coupon_controller_1 = require("./coupon.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
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
router.get("/validate/:code", auth_middleware_1.authenticate, coupon_controller_1.validateCoupon);
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
router.get("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("coupons.manage"), coupon_controller_1.getCoupons);
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
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("coupons.manage"), coupon_controller_1.createCoupon);
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
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("coupons.manage"), coupon_controller_1.deleteCoupon);
exports.default = router;
