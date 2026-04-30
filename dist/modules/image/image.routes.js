"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const image_controller_1 = require("./image.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Images
 *   description: Product image delivery
 */
/**
 * @swagger
 * /api/images/{id}:
 *   get:
 *     summary: Get product image by ID
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image file retrieved successfully
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 */
router.get("/:id", image_controller_1.getProductImage);
exports.default = router;
