import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Custom CSRF protection middleware using Double Submit Cookie pattern.
 * It sets an 'XSRF-TOKEN' cookie (JS-accessible) and verifies it against the 'X-CSRF-Token' header.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // 1. Generate CSRF token if it doesn't exist
  let csrfToken = req.cookies["XSRF-TOKEN"];
  
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString("hex");
    // Set cookie that the frontend can read
    res.cookie("XSRF-TOKEN", csrfToken, {
      httpOnly: false, // Must be accessible by JS
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  // Attach to locals for response body usage
  res.locals.csrfToken = csrfToken;

  // 2. Skip validation for safe methods AND specific routes like login/register
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  const skipRoutes = ["/api/auth/login", "/api/auth/register", "/api/auth/send-otp"]; 
  
  if (safeMethods.includes(req.method) || skipRoutes.some(route => req.originalUrl.includes(route))) {
    return next();
  }

  // 3. Validate token for state-changing methods
  const headerToken = req.headers["x-csrf-token"];

  if (!headerToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF token missing from request headers",
    });
  }

  if (!csrfToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF cookie missing or expired",
    });
  }

  if (headerToken !== csrfToken) {
    return res.status(403).json({
      success: false,
      message: "Invalid CSRF token mismatch",
    });
  }

  next();
};
