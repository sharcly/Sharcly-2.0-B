import { Router } from "express";
import { universalSearch } from "./search.controller";

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

export default router;
