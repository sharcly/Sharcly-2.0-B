import { prisma } from "../../common/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail, sendOtpEmail } from "./email.service";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || "fallback_access_secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "fallback_refresh_secret";
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
    const { email, password, name, otp } = registerData;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    // Verify OTP
    const otpRecord = await prisma.otp.findUnique({ where: { email } });
    if (!otpRecord || otpRecord.code !== otp || otpRecord.expiresAt < new Date()) {
      throw new Error("Invalid or expired verification code.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
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

  static async sendOtp(email: string) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("An account with this email already exists.");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otp.upsert({
      where: { email },
      update: { code, expiresAt },
      create: { email, code, expiresAt }
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
    const { email, password } = loginData;

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { 
        userRole: true
      }
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (user.isBlocked) {
      throw new Error("Your account is blocked. Please contact admin for support.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
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

    if (!user || user.refreshToken !== refreshToken) {
      throw new Error("Invalid refresh token or user not found");
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
        userRole: true
      }
    });

    if (!user) {
      throw new Error("User not found");
    }

    const { password: _, refreshToken: __, verificationToken: ___, ...userWithoutSensitiveData } = user;
    return userWithoutSensitiveData;
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

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    return await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
  }
}
