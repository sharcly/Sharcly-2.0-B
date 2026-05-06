"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const prisma_1 = require("../../common/lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const email_service_1 = require("./email.service");
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";
if (process.env.NODE_ENV === "production") {
    if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
        throw new Error("JWT_SECRET and REFRESH_TOKEN_SECRET must be set in production");
    }
}
class AuthService {
    static async generateTokens(userId, roleSlug) {
        const accessToken = jsonwebtoken_1.default.sign({ id: userId, role: roleSlug.toLowerCase() }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
        const refreshToken = jsonwebtoken_1.default.sign({ id: userId }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { refreshToken }
        });
        return { accessToken, refreshToken };
    }
    static async register(registerData) {
        const { password, name, otp } = registerData;
        const email = registerData.email?.toLowerCase().trim();
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error("User already exists");
        }
        // Verify OTP
        const otpRecord = await prisma_1.prisma.otp.findUnique({ where: { email } });
        if (!otpRecord || otpRecord.code !== otp || otpRecord.expiresAt < new Date()) {
            throw new Error("Invalid or expired verification code.");
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const verificationToken = crypto_1.default.randomBytes(32).toString("hex");
        const userRole = await prisma_1.prisma.role.findUnique({ where: { slug: "user" } });
        if (!userRole) {
            throw new Error("Default user role not found. Please run seed script.");
        }
        const user = await prisma_1.prisma.$transaction(async (tx) => {
            return await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    roleId: userRole.id,
                    verificationToken
                },
                include: { userRole: true }
            });
        });
        // Send verification email
        try {
            await (0, email_service_1.sendVerificationEmail)(email, verificationToken);
        }
        catch (emailError) {
            console.error("Failed to send verification email:", emailError);
        }
        const roleSlug = user.userRole?.slug || "user";
        const tokens = await this.generateTokens(user.id, roleSlug);
        return {
            tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: roleSlug,
            }
        };
    }
    static async verifyEmail(token) {
        const user = await prisma_1.prisma.user.findFirst({
            where: { verificationToken: token }
        });
        if (!user) {
            throw new Error("Invalid or expired token");
        }
        return await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { isEmailVerified: true, verificationToken: null }
        });
    }
    static async sendOtp(rawEmail) {
        const email = rawEmail.toLowerCase().trim();
        // Check if user already exists
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error("An account with this email already exists.");
        }
        const code = crypto_1.default.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await prisma_1.prisma.otp.upsert({
            where: { email },
            update: { code, expiresAt },
            create: { email, code, expiresAt }
        });
        try {
            await (0, email_service_1.sendOtpEmail)(email, code);
        }
        catch (error) {
            console.error("Failed to send OTP:", error);
            throw new Error("Failed to send verification code. Please try again.");
        }
        return true;
    }
    static async login(loginData) {
        const { password } = loginData;
        const email = loginData.email?.toLowerCase().trim();
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
            include: {
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
            throw new Error("Account not found");
        }
        if (user.isBlocked) {
            throw new Error("Your account is blocked. Please contact admin for support.");
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            console.warn(`[Login] Password mismatch for: ${email}`);
            throw new Error("Invalid credentials");
        }
        const roleSlug = user.userRole?.slug || "user";
        const permissions = user.userRole?.permissions.map(p => p.permission.slug) || [];
        let tokens;
        try {
            tokens = await this.generateTokens(user.id, roleSlug);
        }
        catch (tokenError) {
            console.error(`[Login] Token generation failed for ${email}:`, tokenError);
            throw new Error("Failed to initialize session. Please try again later.");
        }
        return {
            tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: roleSlug,
                permissions
            }
        };
    }
    static async refreshTokens(refreshToken) {
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(refreshToken, REFRESH_TOKEN_SECRET);
        }
        catch (err) {
            throw new Error("Invalid refresh token");
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.id },
            include: { userRole: true }
        });
        if (!user || user.refreshToken !== refreshToken) {
            throw new Error("Invalid refresh token or user not found");
        }
        const roleSlug = user.userRole?.slug || "user";
        return await this.generateTokens(user.id, roleSlug);
    }
    static async logout(userId) {
        return await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null }
        });
    }
    static async getProfile(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                addresses: true,
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
            throw new Error("User not found");
        }
        const { password: _, refreshToken: __, verificationToken: ___, ...userWithoutSensitiveData } = user;
        const permissions = user.userRole?.permissions.map(p => p.permission.slug) || [];
        return {
            ...userWithoutSensitiveData,
            permissions
        };
    }
    static async changePassword(userId, data) {
        const { currentPassword, newPassword } = data;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error("User not found");
        }
        // Always required — no optional check
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            throw new Error("Current password is incorrect");
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        return await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
    }
    static async forgotPassword(email) {
        const user = await prisma_1.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            // Don't reveal if user exists for security
            return;
        }
        const resetToken = jsonwebtoken_1.default.sign({
            id: user.id,
            purpose: "password_reset",
            version: user.password.slice(-10) // One-time use trick
        }, ACCESS_TOKEN_SECRET, { expiresIn: "7h" });
        await (0, email_service_1.sendPasswordResetEmail)(user.email, resetToken);
    }
    static async resetPassword(token, newPassword) {
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, ACCESS_TOKEN_SECRET);
        }
        catch (err) {
            throw new Error("Invalid or expired reset token");
        }
        if (payload.purpose !== "password_reset") {
            throw new Error("Invalid token purpose");
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || user.password.slice(-10) !== payload.version) {
            throw new Error("This reset link has already been used or is invalid.");
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: payload.id },
            data: {
                password: hashedPassword,
                refreshToken: null // Logout from all devices on password reset
            }
        });
    }
    static async deactivateAccount(userId) {
        // Simply block the user or mark as deleted
        // For now, we'll mark as isBlocked and clear refreshToken
        return await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { isBlocked: true, refreshToken: null }
        });
    }
}
exports.AuthService = AuthService;
