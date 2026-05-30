import { Router } from "express";
import { 
  getPageContent, 
  updateContent 
} from "./cms.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: CMS
 *   description: Website Content Management System
 */

/**
 * @swagger
 * /api/cms/{page}:
 *   get:
 *     summary: Get dynamic content for a page
 *     tags: [CMS]
 *     parameters:
 *       - in: path
 *         name: page
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Page content retrieved successfully
 */
router.get("/:page", getPageContent);

/**
 * @swagger
 * /api/cms:
 *   patch:
 *     summary: Update website content
 *     tags: [CMS]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page: { type: string }
 *               updates: 
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     section: { type: string }
 *                     key: { type: string }
 *                     value: { type: string }
 *                     type: { type: string }
 *     responses:
 *       200:
 *         description: Content updated successfully
 */
router.patch("/", authenticate, authorize("cms.manage"), updateContent);

export default router;
