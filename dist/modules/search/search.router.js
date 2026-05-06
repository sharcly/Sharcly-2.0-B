"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_controller_1 = require("./search.controller");
const admin_search_controller_1 = require("./admin-search.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
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
/**
 * @swagger
 * /api/search/admin:
 *   get:
 *     summary: Admin-only universal search for products, orders, and users
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
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
router.get("/admin", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("dashboard.view"), admin_search_controller_1.adminSearch);
exports.default = router;
