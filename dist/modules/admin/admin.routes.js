"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("./admin.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
// All routes here are restricted to users with management permission
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("users.manage"));
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
router.get("/users", admin_controller_1.getAllUsers);
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
router.post("/users", admin_controller_1.adminCreateUser);
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
router.patch("/users/:id", admin_controller_1.adminUpdateUser);
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
router.patch("/users/:id/block", admin_controller_1.toggleBlockUser);
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
router.delete("/users/:id", admin_controller_1.deleteUser);
// Roles & Permissions management
router.get("/roles", admin_controller_1.getRoles);
router.get("/permissions", admin_controller_1.getPermissions);
router.post("/roles", admin_controller_1.createRole);
router.patch("/roles/:id", admin_controller_1.updateRole);
router.delete("/roles/:id", admin_controller_1.deleteRole);
exports.default = router;
