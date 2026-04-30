"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cms_controller_1 = require("./cms.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
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
router.get("/:page", cms_controller_1.getPageContent);
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
router.patch("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), cms_controller_1.updateContent);
exports.default = router;
