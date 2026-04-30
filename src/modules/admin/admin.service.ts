import { prisma } from "../../common/lib/prisma";
import bcrypt from "bcryptjs";

export class AdminService {
  static async getAllUsers() {
    return await prisma.user.findMany({
      where: {
        OR: [
          { userRole: null },
          { userRole: { slug: { not: "admin" } } }
        ]
      },
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

  static async updateUserRole(id: string, roleId: string) {
    const roleExists = await prisma.role.findUnique({ where: { id: roleId } });
    if (!roleExists) {
      throw new Error("Invalid role id");
    }

    return await prisma.user.update({
      where: { id },
      data: { roleId },
      include: { userRole: true }
    });
  }

  static async toggleBlockUser(id: string, isBlocked: boolean) {
    return await prisma.user.update({
      where: { id },
      data: { isBlocked }
    });
  }

  static async deleteUser(id: string) {
    return await prisma.user.delete({ where: { id } });
  }

  static async createUser(userData: any) {
    const { email, password, name, roleId } = userData;

    const roleExists = await prisma.role.findUnique({ where: { id: roleId } });
    if (!roleExists) {
      throw new Error("Invalid role id");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return await prisma.user.create({
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

  static async updateUser(id: string, updateData: any) {
    const { email, password, name, roleId } = updateData;

    const prismaUpdateData: any = {};
    if (email) prismaUpdateData.email = email;
    if (name) prismaUpdateData.name = name;
    if (roleId) {
      const roleExists = await prisma.role.findUnique({ where: { id: roleId } });
      if (!roleExists) {
        throw new Error("Invalid role id");
      }
      prismaUpdateData.roleId = roleId;
    }
    if (password) {
      prismaUpdateData.password = await bcrypt.hash(password, 10);
    }

    return await prisma.user.update({
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
    return await prisma.role.findMany({
      where: {
        slug: { not: "admin" }
      },
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
    return await prisma.permission.findMany();
  }

  static async createRole(roleData: any) {
    const { name, slug, description, permissionIds } = roleData;

    return await prisma.role.create({
      data: {
        name,
        slug,
        description,
        permissions: {
          create: permissionIds.map((id: string) => ({
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

  static async updateRole(id: string, roleData: any) {
    const { name, slug, description, permissionIds } = roleData;

    // Delete existing permissions and recreate
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });

    return await prisma.role.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        permissions: {
          create: permissionIds.map((id: string) => ({
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

  static async deleteRole(id: string) {
    // Check if role is in use
    const usersWithRole = await prisma.user.count({ where: { roleId: id } });
    if (usersWithRole > 0) {
      throw new Error("Cannot delete role that is assigned to users");
    }

    return await prisma.role.delete({ where: { id } });
  }

  static async getAllIntegrations() {
    return await (prisma as any).apiIntegration.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  static async upsertIntegration(data: any) {
    const { platform, apiKey, config } = data;
    return await (prisma as any).apiIntegration.upsert({
      where: { platform },
      update: { apiKey, config, updatedAt: new Date() },
      create: { platform, apiKey, config }
    });
  }

  static async deleteIntegration(id: string) {
    return await (prisma as any).apiIntegration.delete({ where: { id } });
  }
}
