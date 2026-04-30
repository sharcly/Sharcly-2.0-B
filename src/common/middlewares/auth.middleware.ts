import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || "fallback_access_secret";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    roleId?: string | null;
    userRole?: {
      id: string;
      name: string;
      slug: string;
      permissions: {
        permission: {
          slug: string;
        };
      }[];
    } | null;
  };
}

// Helper to extract token from Bearer header OR httpOnly cookie
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  // Fallback to httpOnly cookie
  if ((req as any).cookies?.access_token) {
    return (req as any).cookies.access_token;
  }
  return null;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as { id: string };

    const user = await prisma.user.findUnique({
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

    req.user = user as any;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next(); // No token, proceed as guest
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as { id: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, isBlocked: true }
    });

    if (user && !user.isBlocked) {
      req.user = user as any;
    }
    next();
  } catch (error) {
    next(); // Invalid token, proceed as guest
  }
};

/**
 * Authorization middleware
 * @param requiredPermissions - List of permission slugs (e.g., 'products.create')
 * If any of the required permissions are possessed by the role, permission is granted.
 */
export const authorize = (...requiredPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
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
