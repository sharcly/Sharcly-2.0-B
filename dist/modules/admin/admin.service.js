"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const prisma_1 = require("../../common/lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class AdminService {
    static async getAllUsers() {
        return await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                roleId: true,
                userRole: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                },
                isBlocked: true,
                createdAt: true
            },
            orderBy: { createdAt: "desc" }
        });
    }
    static async updateUserRole(id, roleId) {
        const roleExists = await prisma_1.prisma.role.findUnique({ where: { id: roleId } });
        if (!roleExists) {
            throw new Error("Invalid role id");
        }
        return await prisma_1.prisma.user.update({
            where: { id },
            data: { roleId },
            include: { userRole: true }
        });
    }
    static async toggleBlockUser(id, isBlocked) {
        return await prisma_1.prisma.user.update({
            where: { id },
            data: { isBlocked }
        });
    }
    static async deleteUser(id) {
        return await prisma_1.prisma.user.delete({ where: { id } });
    }
    static async createUser(userData) {
        const { email, password, name, roleId } = userData;
        const roleExists = await prisma_1.prisma.role.findUnique({ where: { id: roleId } });
        if (!roleExists) {
            throw new Error("Invalid role id");
        }
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error("User already exists with this email");
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        return await prisma_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                roleId,
                isEmailVerified: true
            },
            select: {
                id: true,
                email: true,
                name: true,
                roleId: true,
                userRole: true,
                isBlocked: true,
                createdAt: true
            }
        });
    }
    static async updateUser(id, updateData) {
        const { email, password, name, roleId } = updateData;
        const prismaUpdateData = {};
        if (email)
            prismaUpdateData.email = email;
        if (name)
            prismaUpdateData.name = name;
        if (roleId) {
            const roleExists = await prisma_1.prisma.role.findUnique({ where: { id: roleId } });
            if (!roleExists) {
                throw new Error("Invalid role id");
            }
            prismaUpdateData.roleId = roleId;
        }
        if (password) {
            prismaUpdateData.password = await bcryptjs_1.default.hash(password, 10);
        }
        return await prisma_1.prisma.user.update({
            where: { id },
            data: prismaUpdateData,
            select: {
                id: true,
                email: true,
                name: true,
                roleId: true,
                userRole: true,
                isBlocked: true,
                createdAt: true
            }
        });
    }
    static async getRoles() {
        return await prisma_1.prisma.role.findMany({
            include: {
                _count: {
                    select: { users: true }
                },
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }
    static async getPermissions() {
        return await prisma_1.prisma.permission.findMany();
    }
    static async createRole(roleData) {
        const { name, slug, description, permissionIds } = roleData;
        return await prisma_1.prisma.role.create({
            data: {
                name,
                slug,
                description,
                permissions: {
                    create: permissionIds.map((id) => ({
                        permission: { connect: { id } }
                    }))
                }
            },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }
    static async updateRole(id, roleData) {
        const { name, slug, description, permissionIds } = roleData;
        // Delete existing permissions and recreate
        await prisma_1.prisma.rolePermission.deleteMany({ where: { roleId: id } });
        return await prisma_1.prisma.role.update({
            where: { id },
            data: {
                name,
                slug,
                description,
                permissions: {
                    create: permissionIds.map((id) => ({
                        permission: { connect: { id } }
                    }))
                }
            },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }
    static async deleteRole(id) {
        // Check if role is in use
        const usersWithRole = await prisma_1.prisma.user.count({ where: { roleId: id } });
        if (usersWithRole > 0) {
            throw new Error("Cannot delete role that is assigned to users");
        }
        return await prisma_1.prisma.role.delete({ where: { id } });
    }
}
exports.AdminService = AdminService;
