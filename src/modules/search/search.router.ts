import { Router } from "express";
import { universalSearch } from "./search.controller";
import { adminSearch } from "./admin-search.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

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
router.get("/", universalSearch);

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
router.get("/admin", authenticate, authorize("dashboard.view"), adminSearch);

export default router;
