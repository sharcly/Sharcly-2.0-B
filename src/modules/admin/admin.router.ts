import { Router } from "express";
import { 
  getAllUsers, 
  updateUserRole, 
  toggleBlockUser, 
  deleteUser,
  adminCreateUser,
  adminUpdateUser,
  getRoles,
  getPermissions,
  createRole,
  updateRole,
  deleteRole,
  getAllIntegrations,
  upsertIntegration,
  deleteIntegration
} from "./admin.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import { validate, AdminCreateUserSchema, AdminUpdateUserSchema } from "../../common/middlewares/validate.middleware";

const router = Router();

// All routes here are restricted to users with management permission
router.use(authenticate, authorize("users.manage"));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: System administration and user management
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all system users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 users: { type: array, items: { $ref: '#/components/schemas/User' } }
 */
router.get("/users", getAllUsers);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, role]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               name: { type: string }
 *               role: { type: string, enum: [ADMIN, MANAGER, CONTENT_MANAGER, USER] }
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post("/users", validate(AdminCreateUserSchema), adminCreateUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   patch:
 *     summary: Update user details or password
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               name: { type: string }
 *               role: { type: string, enum: [ADMIN, MANAGER, CONTENT_MANAGER, USER] }
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.patch("/users/:id", validate(AdminUpdateUserSchema), adminUpdateUser);

/**
 * @swagger
 * /api/admin/users/{id}/block:
 *   patch:
 *     summary: Toggle user block status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isBlocked: { type: boolean }
 *     responses:
 *       200:
 *         description: User block status updated successfully
 */
router.patch("/users/:id/block", toggleBlockUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
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
 *         description: User deleted successfully
 */
router.delete("/users/:id", deleteUser);

// Roles & Permissions management
router.get("/roles", getRoles);
router.get("/permissions", getPermissions);
router.post("/roles", createRole);
router.patch("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

// API Integrations
router.get("/integrations", getAllIntegrations);
router.post("/integrations", upsertIntegration);
router.delete("/integrations/:id", deleteIntegration);

export default router;
