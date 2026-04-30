"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blog_controller_1 = require("./blog.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Blogs
 *   description: Editorial content and stories
 */
/**
 * @swagger
 * /api/blogs:
 *   get:
 *     summary: Get all published blogs
 *     tags: [Blogs]
 *     responses:
 *       200:
 *         description: List of blogs retrieved successfully
 */
router.get("/", blog_controller_1.getBlogs);
/**
 * @swagger
 * /api/blogs/{slug}:
 *   get:
 *     summary: Get blog post by slug
 *     tags: [Blogs]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Blog post retrieved successfully
 *       404:
 *         description: Blog not found
 */
router.get("/:slug", blog_controller_1.getBlogBySlug);
/**
 * @swagger
 * /api/blogs:
 *   post:
 *     summary: Create a new blog post
 *     tags: [Blogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               slug: { type: string }
 *               content: { type: string }
 *               authorId: { type: string }
 *     responses:
 *       201:
 *         description: Blog post created successfully
 */
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("blogs.manage"), blog_controller_1.createBlog);
router.patch("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("blogs.manage"), blog_controller_1.updateBlog);
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("blogs.manage"), blog_controller_1.deleteBlog);
exports.default = router;
