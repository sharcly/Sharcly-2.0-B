"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const image_controller_1 = require("./image.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/images/{id}:
 *   get:
 *     summary: Stream a binary image asset
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Binary image data stream
 */
router.get("/:id", image_controller_1.getImage);
exports.default = router;
