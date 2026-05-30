"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRole = exports.updateRole = exports.createRole = exports.getPermissions = exports.getRoles = exports.adminUpdateUser = exports.adminCreateUser = exports.deleteUser = exports.toggleBlockUser = exports.updateUserRole = exports.getAllUsers = void 0;
const admin_service_1 = require("./admin.service");
const getAllUsers = async (req, res) => {
    try {
        const users = await admin_service_1.AdminService.getAllUsers();
        res.status(200).json({ success: true, users });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch users" });
    }
};
exports.getAllUsers = getAllUsers;
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId } = req.body;
        if (!roleId) {
            return res.status(400).json({ message: "RoleId is required" });
        }
        const user = await admin_service_1.AdminService.updateUserRole(id, roleId);
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Failed to update user role" });
    }
};
exports.updateUserRole = updateUserRole;
const toggleBlockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { isBlocked } = req.body;
        const user = await admin_service_1.AdminService.toggleBlockUser(id, isBlocked);
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to update user status" });
    }
};
exports.toggleBlockUser = toggleBlockUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await admin_service_1.AdminService.deleteUser(id);
        res.status(200).json({ success: true, message: "User deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to delete user" });
    }
};
exports.deleteUser = deleteUser;
const adminCreateUser = async (req, res) => {
    try {
        const { email, password, name, roleId } = req.body;
        if (!email || !password || !roleId) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const user = await admin_service_1.AdminService.createUser({ email, password, name, roleId });
        res.status(201).json({ success: true, user });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Failed to create user" });
    }
};
exports.adminCreateUser = adminCreateUser;
const adminUpdateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, name, roleId } = req.body;
        const user = await admin_service_1.AdminService.updateUser(id, { email, password, name, roleId });
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Failed to update user" });
    }
};
exports.adminUpdateUser = adminUpdateUser;
const getRoles = async (req, res) => {
    try {
        const roles = await admin_service_1.AdminService.getRoles();
        res.status(200).json({ success: true, roles });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch roles" });
    }
};
exports.getRoles = getRoles;
const getPermissions = async (req, res) => {
    try {
        const permissions = await admin_service_1.AdminService.getPermissions();
        res.status(200).json({ success: true, permissions });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to fetch permissions" });
    }
};
exports.getPermissions = getPermissions;
const createRole = async (req, res) => {
    try {
        const { name, slug, description, permissionIds } = req.body;
        const role = await admin_service_1.AdminService.createRole({ name, slug, description, permissionIds });
        res.status(201).json({ success: true, role });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to create role" });
    }
};
exports.createRole = createRole;
const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, permissionIds } = req.body;
        const role = await admin_service_1.AdminService.updateRole(id, { name, slug, description, permissionIds });
        res.status(200).json({ success: true, role });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to update role" });
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        await admin_service_1.AdminService.deleteRole(id);
        res.status(200).json({ success: true, message: "Role deleted successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Failed to delete role" });
    }
};
exports.deleteRole = deleteRole;
