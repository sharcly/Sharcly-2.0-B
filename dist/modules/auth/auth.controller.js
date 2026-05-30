"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getMe = exports.getProfile = exports.logout = exports.refreshTokens = exports.login = exports.verifyEmail = exports.register = void 0;
const auth_service_1 = require("./auth.service");
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
};
const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const result = await auth_service_1.AuthService.register({ email, password, name });
        // Set httpOnly cookies
        res.cookie("access_token", result.tokens.accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 24 * 60 * 60 * 1000, // 24h
        });
        res.cookie("refresh_token", result.tokens.refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
        });
        res.status(201).json({
            success: true,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            user: result.user,
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Registration failed" });
    }
};
exports.register = register;
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
        // Set httpOnly cookies (not accessible by JavaScript — XSS safe)
        res.cookie("access_token", result.tokens.accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 24 * 60 * 60 * 1000, // 24h
        });
        res.cookie("refresh_token", result.tokens.refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
        });
        res.status(200).json({
            success: true,
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
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
        // Accept refresh token from body OR from httpOnly cookie
        const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token is required" });
        }
        const tokens = await auth_service_1.AuthService.refreshTokens(refreshToken);
        // Update cookies with new tokens
        res.cookie("access_token", tokens.accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: 24 * 60 * 60 * 1000,
        });
        res.cookie("refresh_token", tokens.refreshToken, {
            ...COOKIE_OPTIONS,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.status(200).json({
            success: true,
            ...tokens
        });
    }
    catch (error) {
        res.status(401).json({ message: error.message || "Token refresh failed" });
    }
};
exports.refreshTokens = refreshTokens;
const logout = async (req, res) => {
    try {
        await auth_service_1.AuthService.logout(req.user.id);
        // Clear httpOnly cookies
        res.clearCookie("access_token", { ...COOKIE_OPTIONS });
        res.clearCookie("refresh_token", { ...COOKIE_OPTIONS });
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
        await auth_service_1.AuthService.changePassword(req.user.id, req.body);
        res.status(200).json({ success: true, message: "Password updated successfully" });
    }
    catch (error) {
        res.status(400).json({ message: error.message || "Password update failed" });
    }
};
exports.changePassword = changePassword;
