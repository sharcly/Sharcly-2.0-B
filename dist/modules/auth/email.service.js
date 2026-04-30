"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendOrderConfirmation = exports.sendVerificationEmail = void 0;
const resend_1 = require("resend");
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey || apiKey === "re_...") {
    console.warn("⚠️  RESEND_API_KEY is missing or invalid. Email services will be disabled.");
}
const resend = apiKey && apiKey !== "re_..." ? new resend_1.Resend(apiKey) : null;
const fromEmail = "Sharcly <onboarding@resend.dev>"; // Update with verified domain in production
const sendVerificationEmail = async (email, token) => {
    if (!resend)
        return;
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "Verify your email - Sharcly",
        html: `
      <h1>Welcome to Sharcly!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>If you did not create an account, you can safely ignore this email.</p>
    `,
    });
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendOrderConfirmation = async (email, orderDetails) => {
    if (!resend)
        return;
    await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `Order Confirmation - #${orderDetails.id.slice(0, 8)}`,
        html: `
      <h1>Thank you for your order!</h1>
      <p>Your order for ${orderDetails.items.length} item(s) has been placed successfully.</p>
      <p>Total Amount: $${Number(orderDetails.totalAmount).toFixed(2)}</p>
      <p>Shipping Address: ${orderDetails.address}</p>
      <p>We will notify you once your order has been shipped!</p>
    `,
    });
};
exports.sendOrderConfirmation = sendOrderConfirmation;
const sendPasswordResetEmail = async (email, token) => {
    if (!resend)
        return;
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "Reset your password - Sharcly",
        html: `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
    `,
    });
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
