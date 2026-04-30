import { Resend } from "resend";
import { InvoiceService } from "../order/invoice.service";
import { Readable } from "stream";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey || apiKey === "re_...") {
  console.warn("⚠️  RESEND_API_KEY is missing or invalid. Email services will be disabled.");
}

const resend = apiKey && apiKey !== "re_..." ? new Resend(apiKey) : null;
const fromEmail = "Sharcly <onboarding@resend.dev>"; // Update with verified domain in production

export const sendVerificationEmail = async (email: string, token: string) => {
  if (!resend) return;
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

export const sendOrderConfirmation = async (email: string, orderDetails: any) => {
  if (!resend) return;

  try {
    const invoiceBuffer = await InvoiceService.generateInvoiceBuffer(orderDetails);
    
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Order Confirmation - #${orderDetails.id.slice(0, 8)}`,
      attachments: [
        {
          filename: `invoice-${orderDetails.id.slice(0, 8)}.pdf`,
          content: invoiceBuffer,
        },
      ],
      html: `
        <h1>Thank you for your order!</h1>
        <p>Your order for ${orderDetails.items.length} item(s) has been placed successfully.</p>
        <p>Total Amount: $${Number(orderDetails.totalAmount).toFixed(2)}</p>
        <p>Shipping Address: ${orderDetails.address}</p>
        <p>An invoice has been attached to this email for your records.</p>
        <p>We will notify you once your order has been shipped!</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
};

export const sendOrderStatusUpdate = async (email: string, order: any) => {
  if (!resend) return;

  try {
    let attachments: any[] = [];
    if (order.status === "CONFIRMED") {
      const invoiceBuffer = await InvoiceService.generateInvoiceBuffer(order);
      attachments.push({
        filename: `invoice-${order.id.slice(0, 8)}.pdf`,
        content: invoiceBuffer,
      });
    }

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Order Update - #${order.id.slice(0, 8)}: ${order.status}`,
      attachments,
      html: `
        <h1>Your order status has been updated!</h1>
        <p>Order ID: <strong>#${order.id}</strong></p>
        <p>Current Status: <strong>${order.status}</strong></p>
        ${order.trackingNumber ? `<p>Tracking Number: <strong>${order.trackingNumber}</strong></p>` : ""}
        ${order.carrier ? `<p>Carrier: <strong>${order.carrier}</strong></p>` : ""}
        <p>Visit our site to track your order details.</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send order status update email:", error);
  }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  if (!resend) return;
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

export const sendWelcomeCoupon = async (email: string, couponCode: string, discount: string) => {
  if (!resend) return;
  
  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Your Welcome Discount - Sharcly",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
        <h1 style="color: #062D1B; font-size: 24px; text-align: center;">Welcome to Sharcly!</h1>
        <p style="font-size: 16px; color: #444; line-height: 1.6;">Thank you for joining our community. As a welcome gift, we've generated a special discount code for you.</p>
        
        <div style="background: #f4fdf4; padding: 30px; border-radius: 15px; text-align: center; margin: 30px 0;">
          <p style="text-transform: uppercase; font-weight: 900; letter-spacing: 2px; color: #062D1B; margin-bottom: 10px;">Your Discount Code</p>
          <h2 style="font-size: 36px; color: #062D1B; margin: 0;">${couponCode}</h2>
          <p style="font-size: 14px; color: #062D1B; opacity: 0.6; margin-top: 10px;">Use this code for ${discount}% OFF your first order.</p>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/products" style="background: #062D1B; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Shop Now</a>
        </div>
        
        <p style="font-size: 12px; color: #888; text-align: center; margin-top: 40px;">If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
};

export const sendOtpEmail = async (email: string, otp: string) => {
  if (!resend) return;
  
  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Verification Code: ${otp} - Sharcly`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
        <h1 style="color: #062D1B; font-size: 24px; text-align: center;">Verify Your Email</h1>
        <p style="font-size: 16px; color: #444; line-height: 1.6;">Use the following code to complete your registration on Sharcly:</p>
        
        <div style="background: #f4fdf4; padding: 30px; border-radius: 15px; text-align: center; margin: 30px 0;">
          <h2 style="font-size: 42px; letter-spacing: 10px; color: #062D1B; margin: 0;">${otp}</h2>
          <p style="font-size: 14px; color: #062D1B; opacity: 0.6; margin-top: 10px;">This code will expire in 10 minutes.</p>
        </div>

        <p style="font-size: 12px; color: #888; text-align: center; margin-top: 40px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
  });
};

