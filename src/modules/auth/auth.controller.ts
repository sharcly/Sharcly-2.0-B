import { Request, Response } from "express";
import { AuthService } from "./auth.service";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    const result = await AuthService.register({ email, password, name });

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
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Registration failed" });
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    await AuthService.sendOtp(email);
    res.status(200).json({ success: true, message: "Verification code sent to your email" });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to send OTP" });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Token is required" });

    await AuthService.verifyEmail(token as string);
    res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Verification failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login({ email, password });

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
  } catch (error: any) {
    res.status(401).json({ message: error.message || "Login failed" });
  }
};

export const refreshTokens = async (req: Request, res: Response) => {
  try {
    // Accept refresh token from body OR from httpOnly cookie
    const refreshToken = req.body.refreshToken || (req as any).cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const tokens = await AuthService.refreshTokens(refreshToken);

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
  } catch (error: any) {
    res.status(401).json({ message: error.message || "Token refresh failed" });
  }
};

export const logout = async (req: any, res: Response) => {
  try {
    await AuthService.logout(req.user.id);

    // Clear httpOnly cookies
    res.clearCookie("access_token", { ...COOKIE_OPTIONS });
    res.clearCookie("refresh_token", { ...COOKIE_OPTIONS });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Logout failed" });
  }
};

export const getProfile = async (req: any, res: Response) => {
  try {
    const user = await AuthService.getProfile(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(404).json({ message: error.message || "Failed to get profile" });
  }
};

// GET /auth/me — returns current user from token/cookie (used for session restore on page reload)
export const getMe = async (req: any, res: Response) => {
  try {
    const user = await AuthService.getProfile(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(401).json({ message: "Session invalid" });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    await AuthService.changePassword(req.user.id, req.body);
    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Password update failed" });
  }
};
