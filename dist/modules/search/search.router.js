"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_controller_1 = require("./search.controller");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Universal search for products and blogs
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.get("/", search_controller_1.universalSearch);
exports.default = router;
