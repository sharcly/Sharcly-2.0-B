"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const seo_controller_1 = require("./seo.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
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
router.get("/page/:slug", seo_controller_1.getSeoBySlug);
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
router.get("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), seo_controller_1.getAllSeo);
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
router.get("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), seo_controller_1.getSeoById);
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
router.put("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), seo_controller_1.upsertSeo);
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
router.put("/bulk", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), seo_controller_1.bulkUpsertSeo);
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
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), seo_controller_1.deleteSeo);
/**
 * @swagger
 * /api/seo/global:
 *   get:
 *     summary: Fetch site-wide global SEO settings
 *     tags: [SEO]
 */
router.get("/global/settings", seo_controller_1.getGlobalSeo);
/**
 * @swagger
 * /api/seo/global:
 *   put:
 *     summary: Update site-wide global SEO settings
 *     tags: [SEO]
 *     security:
 *       - bearerAuth: []
 */
router.put("/global/settings", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), seo_controller_1.updateGlobalSeo);
exports.default = router;
