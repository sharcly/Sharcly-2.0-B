import { Request, Response } from "express";
import { AdminService } from "./admin.service";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await AdminService.getAllUsers();
    res.status(200).json({ success: true, users });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch users" });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ message: "RoleId is required" });
    }

    const user = await AdminService.updateUserRole(id, roleId);
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update user role" });
  }
};

export const toggleBlockUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { isBlocked } = req.body;

    const user = await AdminService.toggleBlockUser(id, isBlocked);
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update user status" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await AdminService.deleteUser(id);
    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to delete user" });
  }
};

export const adminCreateUser = async (req: Request, res: Response) => {
  try {
    const { email, password, name, roleId } = req.body;

    if (!email || !password || !roleId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await AdminService.createUser({ email, password, name, roleId });
    res.status(201).json({ success: true, user });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create user" });
  }
};

export const adminUpdateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { email, password, name, roleId } = req.body;

    const user = await AdminService.updateUser(id, { email, password, name, roleId });
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update user" });
  }
};

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await AdminService.getRoles();
    res.status(200).json({ success: true, roles });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch roles" });
  }
};

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await AdminService.getPermissions();
    res.status(200).json({ success: true, permissions });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch permissions" });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, permissionIds } = req.body;
    const role = await AdminService.createRole({ name, slug, description, permissionIds });
    res.status(201).json({ success: true, role });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create role" });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { name, slug, description, permissionIds } = req.body;

    const role = await AdminService.updateRole(id, { name, slug, description, permissionIds });
    res.status(200).json({ success: true, role });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update role" });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await AdminService.deleteRole(id);
    res.status(200).json({ success: true, message: "Role deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to delete role" });
  }
};

export const getAllIntegrations = async (req: Request, res: Response) => {
  try {
    const integrations = await AdminService.getAllIntegrations();
    res.status(200).json({ success: true, integrations });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch integrations" });
  }
};

export const upsertIntegration = async (req: Request, res: Response) => {
  try {
    const { platform, apiKey, config } = req.body;
    if (!platform || !apiKey) {
      return res.status(400).json({ message: "Platform and API Key are required" });
    }
    const integration = await AdminService.upsertIntegration({ platform, apiKey, config });
    res.status(200).json({ success: true, integration });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to save integration" });
  }
};

export const deleteIntegration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await AdminService.deleteIntegration(id);
    res.status(200).json({ success: true, message: "Integration deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to delete integration" });
  }
};
