import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Custom CSRF protection middleware using Double Submit Cookie pattern.
 * It sets a 'csrf-token' cookie (JS-accessible) and verifies it against the 'X-CSRF-Token' header.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // 1. Generate CSRF token if it doesn't exist
  let csrfToken = req.cookies["csrf-token"];
  
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString("hex");
    // Set cookie that the frontend can read
    res.cookie("csrf-token", csrfToken, {
      httpOnly: false, // Must be accessible by JS to send in header
      secure: true,    // Required for SameSite=None
      sameSite: "none",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  // 2. Skip validation for safe methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 3. Validate token for state-changing methods
  // We check the header sent by the frontend
  const headerToken = req.headers["x-csrf-token"];

  if (!headerToken || headerToken !== csrfToken) {
    console.warn(`[CSRF] 403: Invalid or missing token for ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      message: "Invalid or missing CSRF token",
    });
  }

  next();
};
