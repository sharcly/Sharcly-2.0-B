import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Custom CSRF protection middleware using Double Submit Cookie pattern.
 * It sets a 'csrf-token' cookie (JS-accessible) and verifies it against the 'x-csrf-token' header.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const methodsToProtect = ["POST", "PUT", "DELETE", "PATCH"];
  
  // 1. Generate token if it doesn't exist in cookie
  if (!req.cookies["csrf-token"]) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie("csrf-token", token, {
      httpOnly: false, // Must be accessible by JS
      secure: true,
      sameSite: "none",
      path: "/",
    });
  }

  // 2. Skip verification for safe methods
  if (!methodsToProtect.includes(req.method)) {
    return next();
  }

  // 3. Verify token
  const cookieToken = req.cookies["csrf-token"];
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    console.warn(`[CSRF] 403: Token mismatch or missing for ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      message: "Invalid or missing CSRF token",
    });
  }

  next();
};
