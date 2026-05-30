"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.optionalAuth = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || "fallback_access_secret";
// Helper to extract token from Bearer header OR httpOnly cookie
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.split(" ")[1];
    }
    // Fallback to httpOnly cookie
    if (req.cookies?.access_token) {
        return req.cookies.access_token;
    }
    return null;
}
const authenticate = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({ message: "Authentication required" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, ACCESS_TOKEN_SECRET);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                roleId: true,
                isBlocked: true,
                userRole: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                }
            }
        });
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        if (user.isBlocked) {
            return res.status(403).json({ message: "User is blocked" });
        }
        req.user = user;
        next();
    }
    catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;
const optionalAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return next(); // No token, proceed as guest
        }
        const decoded = jsonwebtoken_1.default.verify(token, ACCESS_TOKEN_SECRET);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, isBlocked: true }
        });
        if (user && !user.isBlocked) {
            req.user = user;
        }
        next();
    }
    catch (error) {
        next(); // Invalid token, proceed as guest
    }
};
exports.optionalAuth = optionalAuth;
/**
 * Authorization middleware
 * @param requiredPermissions - List of permission slugs (e.g., 'products.create')
 * If any of the required permissions are possessed by the role, permission is granted.
 */
const authorize = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Authentication required" });
        }
        // Admin superuser check - if role slug is 'admin', grant all
        if (req.user.userRole?.slug === 'admin') {
            return next();
        }
        const userPermissions = req.user.userRole?.permissions.map(p => p.permission.slug) || [];
        // Must have at least one required permission — empty authorize() now requires admin only
        const hasPermission = requiredPermissions.length > 0 &&
            requiredPermissions.some(perm => userPermissions.includes(perm));
        if (!hasPermission) {
            return res.status(403).json({
                message: `You do not have the required permissions to access this route`
            });
        }
        next();
    };
};
exports.authorize = authorize;
