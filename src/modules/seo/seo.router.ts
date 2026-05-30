import { Router } from "express";
import {
  getSeoBySlug,
  getAllSeo,
  getSeoById,
  upsertSeo,
  deleteSeo,
  bulkUpsertSeo,
  getGlobalSeo,
  updateGlobalSeo
} from "./seo.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: SEO
 *   description: SEO Meta Management
 */

/**
 * @swagger
 * /api/seo/page/{slug}:
 *   get:
 *     summary: Get SEO meta for a page (public)
 *     tags: [SEO]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Page slug (e.g., "home", "about", "products")
 *     responses:
 *       200:
 *         description: SEO data retrieved
 */
router.get("/page/:slug", getSeoBySlug);

/**
 * @swagger
 * /api/seo:
 *   get:
 *     summary: List all SEO entries (admin)
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All SEO entries
 */
router.get("/", authenticate, authorize("seo.manage"), getAllSeo);

/**
 * @swagger
 * /api/seo/{id}:
 *   get:
 *     summary: Get SEO entry by ID (admin)
 *     tags: [SEO]
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
 *         description: SEO entry details
 */
router.get("/:id", authenticate, authorize("seo.manage"), getSeoById);

/**
 * @swagger
 * /api/seo:
 *   put:
 *     summary: Create or update SEO for a page (upsert)
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pageSlug]
 *             properties:
 *               pageSlug: { type: string }
 *               title: { type: string }
 *               description: { type: string }
 *               keywords: { type: string }
 *               ogTitle: { type: string }
 *               ogDescription: { type: string }
 *               ogImage: { type: string }
 *               canonicalUrl: { type: string }
 *               robots: { type: string }
 *               structuredData: { type: string }
 *     responses:
 *       200:
 *         description: SEO settings saved
 */
router.put("/", authenticate, authorize("seo.manage"), upsertSeo);

/**
 * @swagger
 * /api/seo/bulk:
 *   put:
 *     summary: Bulk create/update SEO entries
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     pageSlug: { type: string }
 *                     title: { type: string }
 *                     description: { type: string }
 *     responses:
 *       200:
 *         description: Bulk SEO update complete
 */
router.put("/bulk", authenticate, authorize("seo.manage"), bulkUpsertSeo);

/**
 * @swagger
 * /api/seo/{id}:
 *   delete:
 *     summary: Delete an SEO entry
 *     tags: [SEO]
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
 *         description: SEO entry deleted
 */
router.delete("/:id", authenticate, authorize("seo.manage"), deleteSeo);

/**
 * @swagger
 * /api/seo/global:
 *   get:
 *     summary: Fetch site-wide global SEO settings
 *     tags: [SEO]
 */
router.get("/global/settings", getGlobalSeo);

/**
 * @swagger
 * /api/seo/global:
 *   put:
 *     summary: Update site-wide global SEO settings
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 */
router.put("/global/settings", authenticate, authorize("seo.manage"), updateGlobalSeo);

export default router;
