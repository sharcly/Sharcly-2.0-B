"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivateAccount = exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.getMe = exports.getProfile = exports.logout = exports.refreshTokens = exports.login = exports.verifyEmail = exports.sendOtp = exports.register = void 0;
const auth_service_1 = require("./auth.service");
const getCookieOptions = (req) => {
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    return {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
        path: "/",
    };
};
const register = async (req, res) => {
    try {
        const { email, password, name, otp } = req.body;
        const result = await auth_service_1.AuthService.register({ email, password, name, otp });
        const cookieOptions = getCookieOptions(req);
        res.cookie("access_token", result.tokens.accessToken, {
            ...cookieOptions,
            maxAge: 24 * 60 * 60 * 1000, // 24h
        });
        res.cookie("refresh_token", result.tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
        });
        res.status(201).json({
            success: true,
            user: result.user,
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Registration failed" });
    }
};
exports.register = register;
const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ message: "Email is required" });
        await auth_service_1.AuthService.sendOtp(email);
        res.status(200).json({ success: true, message: "Verification code sent to your email" });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Failed to send OTP" });
    }
};
exports.sendOtp = sendOtp;
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token)
            return res.status(400).json({ message: "Token is required" });
        await auth_service_1.AuthService.verifyEmail(token);
        res.status(200).json({ success: true, message: "Email verified successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Verification failed" });
    }
};
exports.verifyEmail = verifyEmail;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await auth_service_1.AuthService.login({ email, password });
        const cookieOptions = getCookieOptions(req);
        res.cookie("access_token", result.tokens.accessToken, {
            ...cookieOptions,
            maxAge: 24 * 60 * 60 * 1000, // 24h
        });
        res.cookie("refresh_token", result.tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
        });
        res.status(200).json({
            success: true,
            user: result.user,
        });
    }
    catch (error) {
        res.status(401).json({ message: error.message || "Login failed" });
    }
};
exports.login = login;
const refreshTokens = async (req, res) => {
    try {
        const bodyToken = req.body.refreshToken;
        const cookieToken = req.cookies?.refresh_token;
        const refreshToken = bodyToken || cookieToken;
        if (!refreshToken) {
            console.warn("[Auth] Refresh token missing. Body:", !!bodyToken, "Cookie:", !!cookieToken);
            return res.status(400).json({
                success: false,
                message: "Refresh token is required"
            });
        }
        const tokens = await auth_service_1.AuthService.refreshTokens(refreshToken);
        const cookieOptions = getCookieOptions(req);
        res.cookie("access_token", tokens.accessToken, {
            ...cookieOptions,
            maxAge: 24 * 60 * 60 * 1000,
        });
        res.cookie("refresh_token", tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.status(200).json({
            success: true,
        });
    }
    catch (error) {
        console.error("[Auth] Refresh token failed:", error.message);
        res.status(401).json({
            success: false,
            message: error.message || "Token refresh failed"
        });
    }
};
exports.refreshTokens = refreshTokens;
const logout = async (req, res) => {
    try {
        if (req.user?.id) {
            await auth_service_1.AuthService.logout(req.user.id).catch((err) => {
                console.warn("[Logout] Failed to clear refreshToken in DB:", err.message);
            });
        }
        // Clear httpOnly cookies
        const cookieOptions = getCookieOptions(req);
        res.clearCookie("access_token", { ...cookieOptions });
        res.clearCookie("refresh_token", { ...cookieOptions });
        res.status(200).json({ success: true, message: "Logged out successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Logout failed" });
    }
};
exports.logout = logout;
const getProfile = async (req, res) => {
    try {
        const user = await auth_service_1.AuthService.getProfile(req.user.id);
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        res.status(404).json({ message: error.message || "Failed to get profile" });
    }
};
exports.getProfile = getProfile;
// GET /auth/me — returns current user from token/cookie (used for session restore on page reload)
const getMe = async (req, res) => {
    try {
        const user = await auth_service_1.AuthService.getProfile(req.user.id);
        res.status(200).json({ success: true, user });
    }
    catch (error) {
        res.status(401).json({ message: "Session invalid" });
    }
};
exports.getMe = getMe;
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;
        await auth_service_1.AuthService.changePassword(userId, { currentPassword, newPassword });
        res.status(200).json({ success: true, message: "Password updated successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Failed to update password" });
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        await auth_service_1.AuthService.forgotPassword(email);
        res.status(200).json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Failed to process request" });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        await auth_service_1.AuthService.resetPassword(token, password);
        res.status(200).json({ success: true, message: "Your password has been reset successfully." });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Failed to reset password" });
    }
};
exports.resetPassword = resetPassword;
const deactivateAccount = async (req, res) => {
    try {
        await auth_service_1.AuthService.deactivateAccount(req.user.id);
        // Clear cookies
        const cookieOptions = getCookieOptions(req);
        res.clearCookie("access_token", { ...cookieOptions });
        res.clearCookie("refresh_token", { ...cookieOptions });
        res.status(200).json({ success: true, message: "Account deactivated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Failed to deactivate account" });
    }
};
exports.deactivateAccount = deactivateAccount;
