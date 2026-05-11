"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfProtection = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Custom CSRF protection middleware using Double Submit Cookie pattern.
 * It sets an 'XSRF-TOKEN' cookie (JS-accessible) and verifies it against the 'X-CSRF-Token' header.
 */
const csrfProtection = (req, res, next) => {
    // 1. Generate CSRF token if it doesn't exist
    let csrfToken = req.cookies["XSRF-TOKEN"];
    if (!csrfToken) {
        csrfToken = crypto_1.default.randomBytes(32).toString("hex");
        // Set cookie that the frontend can read
        const isProd = process.env.NODE_ENV === "production";
        const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
        res.cookie("XSRF-TOKEN", csrfToken, {
            httpOnly: false, // Must be accessible by JS
            secure: isSecure,
            sameSite: isSecure ? "none" : "lax",
            path: "/",
            maxAge: 24 * 60 * 60 * 1000,
        });
    }
    // Attach to locals for response body usage
    res.locals.csrfToken = csrfToken;
    // 1.5. Inject CSRF token into JSON responses (for cross-domain accessibility)
    const originalJson = res.json;
    res.json = function (body) {
        if (body && typeof body === "object" && !body.csrfToken && res.locals.csrfToken) {
            body.csrfToken = res.locals.csrfToken;
        }
        return originalJson.call(this, body);
    };
    // 2. Skip validation for safe methods OR specific public routes
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    const skipRoutes = [
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/send-otp",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/refresh-token",
        "/api/wholesale/inquiries",
        "/api/shipping/calculate",
        "/api/coupon/validate",
        "/api/marketing/subscribe",
        "/api/payments/webhook"
    ];
    const isSafeMethod = safeMethods.includes(req.method);
    const isSkippedRoute = skipRoutes.some(route => req.originalUrl.includes(route));
    // Also skip if no auth cookies are present (nothing to hijack)
    const hasAuthCookies = req.cookies["access_token"] || req.cookies["refresh_token"];
    if (isSafeMethod || isSkippedRoute || !hasAuthCookies) {
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
exports.csrfProtection = csrfProtection;
