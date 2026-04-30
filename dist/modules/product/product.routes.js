"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_controller_1 = require("./product.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product catalog and inventory management
 */
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get("/", product_controller_1.getProducts);
/**
 * @swagger
 * /api/products/categories:
 *   get:
 *     summary: Get all product categories
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
 */
router.get("/categories", product_controller_1.getCategories);
router.get("/collections", product_controller_1.getCollections);
router.get("/tags", product_controller_1.getTags);
router.get("/types", product_controller_1.getTypes);
router.get("/:slug", product_controller_1.getProductBySlug);
/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               stock: { type: integer }
 *               categoryId: { type: string }
 *               images: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       201:
 *         description: Product created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin/Manager only)
 */
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("products.create"), product_controller_1.createProduct);
/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Update an existing product
 *     tags: [Products]
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
 *         description: Product updated successfully
 */
router.patch("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("products.update"), product_controller_1.updateProduct);
/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
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
 *         description: Product deleted successfully
 */
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("products.delete"), product_controller_1.deleteProduct);
/**
 * @swagger
 * /api/products/categories:
 *   post:
 *     summary: Create a new category
 */
router.post("/categories", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("categories.manage"), product_controller_1.createCategory);
/**
 * @swagger
 * /api/products/categories/{id}:
 *   patch:
 *     summary: Update a category
 */
router.patch("/categories/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("categories.manage"), product_controller_1.updateCategory);
/**
 * @swagger
 * /api/products/categories/{id}:
 *   delete:
 *     summary: Delete a category
 */
router.delete("/categories/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("categories.manage"), product_controller_1.deleteCategory);
// Collections
/**
 * @swagger
 * /api/products/collections:
 *   get:
 *     summary: Get all collections
 */
/**
 * @swagger
 * /api/products/collections/{slug}:
 *   get:
 *     summary: Get collection by slug
 */
router.get("/collections/:slug", product_controller_1.getCollectionBySlug);
/**
 * @swagger
 * /api/products/collections:
 *   post:
 *     summary: Create a new collection
 */
router.post("/collections", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("categories.manage"), product_controller_1.createCollection);
/**
 * @swagger
 * /api/products/collections/{id}:
 *   patch:
 *     summary: Update a collection
 */
router.patch("/collections/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("categories.manage"), product_controller_1.updateCollection);
/**
 * @swagger
 * /api/products/collections/{id}:
 *   delete:
 *     summary: Delete a collection
 */
router.delete("/collections/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("categories.manage"), product_controller_1.deleteCollection);
router.post("/tags", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("products.update"), product_controller_1.createTag);
router.post("/types", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("products.update"), product_controller_1.createType);
exports.default = router;
