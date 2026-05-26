import { prisma } from "../../common/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail, sendOtpEmail, sendPasswordResetEmail } from "./email.service";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const ACCESS_TOKEN_EXPIRY = "1h";
const REFRESH_TOKEN_EXPIRY = "7d";

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("JWT_SECRET and REFRESH_TOKEN_SECRET must be set in production");
  }
}

export class AuthService {
  static async generateTokens(userId: string, roleSlug: string) {
    const accessToken = jwt.sign(
      { id: userId, role: roleSlug.toLowerCase() },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: userId },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken }
    });

    return { accessToken, refreshToken };
  }

  static async register(registerData: any) {
    const { password, name, otp } = registerData;
    const email = registerData.email?.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    // Verify OTP — compare hashed value
    const otpRecord = await prisma.otp.findUnique({ where: { email } });
    const hashedInputOtp = crypto.createHash("sha256").update(otp).digest("hex");
    if (!otpRecord || otpRecord.code !== hashedInputOtp || otpRecord.expiresAt < new Date()) {
      throw new Error("Invalid or expired verification code.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const userRole = await prisma.role.findUnique({ where: { slug: "user" } });
    if (!userRole) {
      throw new Error("Default user role not found. Please run seed script.");
    }

    const user = await prisma.$transaction(async (tx) => {
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
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
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

  static async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      throw new Error("Invalid or expired token");
    }

    return await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, verificationToken: null }
    });
  }

  static async sendOtp(rawEmail: string) {
    const email = rawEmail.toLowerCase().trim();
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("An account with this email already exists.");
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Hash OTP before storing — never store plain-text OTPs in DB
    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    await prisma.otp.upsert({
      where: { email },
      update: { code: hashedCode, expiresAt },
      create: { email, code: hashedCode, expiresAt }
    });

    try {
      await sendOtpEmail(email, code);
    } catch (error) {
      console.error("Failed to send OTP:", error);
      throw new Error("Failed to send verification code. Please try again.");
    }

    return true;
  }

  static async login(loginData: any) {
    const { password } = loginData;
    const email = loginData.email?.toLowerCase().trim();

    const user = await prisma.user.findUnique({ 
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn(`[Login] Password mismatch for: ${email}`);
      throw new Error("Invalid credentials");
    }

    const roleSlug = user.userRole?.slug || "user";
    const permissions = user.userRole?.permissions.map(p => p.permission.slug) || [];
    
    let tokens;
    try {
      tokens = await this.generateTokens(user.id, roleSlug);
    } catch (tokenError: any) {
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

  static async refreshTokens(refreshToken: string) {
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
      throw new Error("Invalid refresh token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { userRole: true }
    });

    // If refreshToken is null in DB, it means they logged out or reset password
    if (!user || !user.refreshToken) {
      throw new Error("Session expired or user logged out");
    }

    const roleSlug = user.userRole?.slug || "user";
    return await this.generateTokens(user.id, roleSlug);
  }

  static async logout(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
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

  static async changePassword(userId: string, data: any) {
    const { currentPassword, newPassword } = data;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new Error("User not found");
    }

    // Always required — no optional check
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error("Current password is incorrect");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      // Don't reveal if user exists for security
      return;
    }

    const resetToken = jwt.sign(
      { 
        id: user.id, 
        purpose: "password_reset",
        version: user.password.slice(-10) // One-time use trick
      },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "7h" }
    );

    await sendPasswordResetEmail(user.email, resetToken);
  }

  static async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (err) {
      throw new Error("Invalid or expired reset token");
    }

    if (payload.purpose !== "password_reset") {
      throw new Error("Invalid token purpose");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.password.slice(-10) !== payload.version) {
      throw new Error("This reset link has already been used or is invalid.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: payload.id },
      data: { 
        password: hashedPassword,
        refreshToken: null // Logout from all devices on password reset
      }
    });
  }

  static async deactivateAccount(userId: string) {
    // Simply block the user or mark as deleted
    // For now, we'll mark as isBlocked and clear refreshToken
    return await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true, refreshToken: null }
    });
  }
}
