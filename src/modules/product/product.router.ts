import { Router } from "express";
import { 
  getProducts,
  createProduct,
  getProductBySlug,
  updateProduct, 
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCollections,
  getCollectionBySlug,
  createCollection,
  updateCollection,
  deleteCollection,
  getTags,
  createTag,
  getTypes,
  createType
} from "./product.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import { upload } from "../../common/utils/cloudinary";
import { validate, CreateProductSchema, UpdateProductSchema } from "../../common/middlewares/validate.middleware";

const router = Router();

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
router.get("/", getProducts);

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
router.get("/categories", getCategories);
router.get("/collections", getCollections);
router.get("/tags", getTags);
router.get("/types", getTypes);
router.get("/:slug", getProductBySlug);

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
// Note: validate() runs after upload.any() so that body fields from multipart are parsed
router.post("/", authenticate, authorize("products.create"), upload.any(), validate(CreateProductSchema), createProduct);

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
router.patch("/:id", authenticate, authorize("products.update"), upload.any(), validate(UpdateProductSchema), updateProduct);

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
router.delete("/:id", authenticate, authorize("products.delete"), deleteProduct);

/**
 * @swagger
 * /api/products/categories:
 *   post:
 *     summary: Create a new category
 */
router.post("/categories", authenticate, authorize("categories.manage"), createCategory);

/**
 * @swagger
 * /api/products/categories/{id}:
 *   patch:
 *     summary: Update a category
 */
router.patch("/categories/:id", authenticate, authorize("categories.manage"), updateCategory);

/**
 * @swagger
 * /api/products/categories/{id}:
 *   delete:
 *     summary: Delete a category
 */
router.delete("/categories/:id", authenticate, authorize("categories.manage"), deleteCategory);

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
router.get("/collections/:slug", getCollectionBySlug);

/**
 * @swagger
 * /api/products/collections:
 *   post:
 *     summary: Create a new collection
 */
router.post("/collections", authenticate, authorize("categories.manage"), createCollection);

/**
 * @swagger
 * /api/products/collections/{id}:
 *   patch:
 *     summary: Update a collection
 */
router.patch("/collections/:id", authenticate, authorize("categories.manage"), updateCollection);

/**
 * @swagger
 * /api/products/collections/{id}:
 *   delete:
 *     summary: Delete a collection
 */
router.delete("/collections/:id", authenticate, authorize("categories.manage"), deleteCollection);

router.post("/tags", authenticate, authorize("products.update"), createTag);

router.post("/types", authenticate, authorize("products.update"), createType);


export default router;
