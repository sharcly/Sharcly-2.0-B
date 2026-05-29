import { Resend } from "resend";
import { InvoiceService } from "../order/invoice.service";
import { Readable } from "stream";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey || apiKey === "re_...") {
  console.warn("⚠️  RESEND_API_KEY is missing or invalid. Email services will be disabled.");
}

const resend = apiKey && apiKey !== "re_..." ? new Resend(apiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL ;
const logoUrl = "https://cdn.mignite.app/ws/works_01KM0WR2ZSKYNHV0ZE2MPNM9EF/final-Logo-1--01KM5Y2NCW8720B30G9G0XW18Y.png";

const baseTemplate = (title: string, content: string, cta?: { text: string; url: string }, footer?: string) => `
  <div style="font-family: 'Inter', sans-serif; background-color: #FDFDFB; padding: 40px 20px;">
    <div style="max-width: 600px; margin: auto; background: white; padding: 40px; border-radius: 24px; border: 1px solid #eee; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="${logoUrl}" alt="Sharcly" style="height: 32px; width: auto;" />
      </div>
      
      <h1 style="color: #062D1B; font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 16px; tracking: -0.02em;">${title}</h1>
      <div style="color: #444; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
        ${content}
      </div>
      
      ${cta ? `
      <div style="text-align: center; margin-bottom: 32px;">
        <a href="${cta.url}" style="background: #062D1B; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; font-size: 14px;">${cta.text}</a>
      </div>
      <p style="color: #999; font-size: 11px; text-align: center; margin-bottom: 24px;">
        If the button doesn't work, copy and paste this link:<br/> 
        <a href="${cta.url}" style="color: #062D1B; text-decoration: none;">${cta.url}</a>
      </p>
      ` : ""}
      
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #eee; text-align: center;">
        <p style="color: #999; font-size: 12px;">${footer || "© 2024 Sharcly Essentials. Pure. Third Party Lab Verified."}</p>
      </div>
    </div>
  </div>
`;

export const sendVerificationEmail = async (email: string, token: string) => {
  if (!resend) {
    console.error("❌ Resend client not initialized. Cannot send verification email to:", email);
    return;
  }
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Verify your email - Sharcly",
      html: baseTemplate(
        "Welcome to Sharcly!",
        "Thank you for joining us. Please verify your email address to get full access to your account and start shopping our premium collection.",
        { text: "Verify Email Address", url: verificationUrl },
        "If you didn't create an account, you can safely ignore this email."
      ),
    });

    if (error) {
      console.error("❌ Resend API Error while sending verification email:", error);
    } else {
      console.log(`✅ Verification Email sent successfully to ${email}. ID: ${data?.id}`);
    }
  } catch (err) {
    console.error("❌ Unexpected Error in sendVerificationEmail:", err);
  }
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
      html: baseTemplate(
        "Thank you for your order!",
        `
        <p>Your order <strong>#${orderDetails.id.slice(0, 8)}</strong> has been placed successfully.</p>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 16px; margin: 20px 0; text-align: left;">
          <p style="margin: 5px 0;"><strong>Items:</strong> ${orderDetails.items.length}</p>
          <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${Number(orderDetails.totalAmount).toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Shipping To:</strong> ${orderDetails.address}</p>
        </div>
        <p>An invoice has been attached to this email for your records. We'll notify you as soon as your package ships!</p>
        `,
        { text: "View Order Details", url: `${process.env.FRONTEND_URL}/account` }
      ),
    });
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
};

export const sendOrderStatusUpdate = async (email: string, order: any) => {
  if (!resend) return;

  // Delegate to specific functions for major status changes
  if (order.status === "SHIPPED") {
    return await sendShippingNotificationEmail(email, order);
  }
  if (order.status === "CANCELLED") {
    return await sendOrderCancellationEmail(email, order, order.cancelReason || "Customer request");
  }
  if (order.status === "DELIVERED") {
    return await sendOrderDeliveredEmail(email, order);
  }

  try {
    let attachments: any[] = [];
    let statusMessage = "We're working on your order.";
    let statusTitle = `Order Status: ${order.status}`;

    if (order.status === "CONFIRMED") {
      statusMessage = "Your payment has been verified and your order is now confirmed.";
      statusTitle = "Order Confirmed";
      const invoiceBuffer = await InvoiceService.generateInvoiceBuffer(order);
      attachments.push({
        filename: `invoice-${order.id.slice(0, 8)}.pdf`,
        content: invoiceBuffer,
      });
    } else if (order.status === "PREPARING") {
      statusMessage = "Our team is carefully picking and packing your items. We'll let you know once it's ready for shipment.";
      statusTitle = "Preparing Your Order";
    }

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Update on Order #${order.id.slice(0, 8)}: ${order.status}`,
      attachments,
      html: baseTemplate(
        statusTitle,
        `
        <p>There's a new update on your order <strong>#${order.id.slice(0, 8)}</strong>.</p>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 16px; margin: 20px 0; border: 1px solid #eee; text-align: center;">
          <p style="margin: 0; color: #062D1B; font-weight: 700; font-size: 18px; text-transform: uppercase;">${order.status}</p>
        </div>
        <p style="text-align: center; color: #666;">${statusMessage}</p>
        `,
        { text: "View Order Details", url: `${process.env.FRONTEND_URL}/account` }
      ),
    });
  } catch (error) {
    console.error("Failed to send order status update email:", error);
  }
};

export const sendShippingNotificationEmail = async (email: string, order: any) => {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Your order #${order.id.slice(0, 8)} has shipped!`,
      html: baseTemplate(
        "Your Order is on its way!",
        `
        <p>Great news! Your order <strong>#${order.id.slice(0, 8)}</strong> has been shipped and is heading your way.</p>
        <div style="background: #f4fdf4; padding: 24px; border-radius: 16px; margin: 20px 0; border: 1px solid #e0f2e0;">
          <p style="margin: 0; color: #062D1B; font-weight: 700; font-size: 18px; text-align: center;">SHIPPED</p>
        </div>
        <div style="text-align: left; margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 16px; border: 1px solid #eee;">
          <h3 style="margin-top: 0; color: #062D1B; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Delivery Info</h3>
          ${order.trackingNumber ? `<p style="margin: 8px 0; font-size: 14px;"><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ""}
          ${order.carrier ? `<p style="margin: 8px 0; font-size: 14px;"><strong>Carrier:</strong> ${order.carrier}</p>` : ""}
          <p style="margin: 8px 0; font-size: 14px;"><strong>Shipping To:</strong> ${order.address || order.shippingAddress}</p>
        </div>
        <p>You can track your package's progress by clicking the button below.</p>
        `,
        { text: "Track Package", url: `${process.env.FRONTEND_URL}/account` }
      ),
    });
  } catch (error) {
    console.error("Failed to send shipping notification email:", error);
  }
};

export const sendOrderCancellationEmail = async (email: string, order: any, reason: string) => {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Order Cancelled - #${order.id.slice(0, 8)}`,
      html: baseTemplate(
        "Order Cancellation",
        `
        <p>Your order <strong>#${order.id.slice(0, 8)}</strong> has been cancelled.</p>
        <div style="background: #fff5f5; padding: 24px; border-radius: 16px; margin: 20px 0; border: 1px solid #fed7d7;">
          <p style="margin: 0; color: #c53030; font-weight: 700; font-size: 18px; text-align: center;">CANCELLED</p>
        </div>
        <div style="text-align: left; margin: 24px 0; padding: 20px; background: #f9f9f9; border-radius: 16px; border: 1px solid #eee;">
          <p style="margin: 0; font-size: 14px;"><strong>Reason for cancellation:</strong> ${reason}</p>
        </div>
        <p>If you have already been charged, a refund will be processed automatically within 5-10 business days. We apologize for any inconvenience.</p>
        `,
        { text: "Visit Store", url: `${process.env.FRONTEND_URL}/products` }
      ),
    });
  } catch (error) {
    console.error("Failed to send cancellation email:", error);
  }
};

export const sendOrderDeliveredEmail = async (email: string, order: any) => {
  if (!resend) return;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Delivered: Your Sharcly order #${order.id.slice(0, 8)}`,
      html: baseTemplate(
        "Order Delivered!",
        `
        <p>Your order <strong>#${order.id.slice(0, 8)}</strong> has been delivered. We hope you love your natural wellness essentials!</p>
        <div style="background: #f4fdf4; padding: 24px; border-radius: 16px; margin: 20px 0; border: 1px solid #e0f2e0;">
          <p style="margin: 0; color: #062D1B; font-weight: 700; font-size: 18px; text-align: center;">DELIVERED</p>
        </div>
        <p>If you have any issues with your delivery or the products, please reply to this email or contact our support team.</p>
        <p><strong>Loved your experience?</strong> We'd love to hear your feedback.</p>
        `,
        { text: "Write a Review", url: `${process.env.FRONTEND_URL}/products` }
      ),
    });
  } catch (error) {
    console.error("Failed to send delivery email:", error);
  }
};

export const sendPasswordResetEmail = async (email: string, token: string) => {
  if (!resend) return;
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Reset your password - Sharcly",
    html: baseTemplate(
      "Password Reset Request",
      "We received a request to reset the password for your Sharcly account. If you didn't make this request, you can safely ignore this email.",
      { text: "Reset Password", url: resetUrl },
      "This link will expire in 7 hours for your security."
    ),
  });
};

export const sendWelcomeCoupon = async (email: string, couponCode: string, discount: string, discountType: string = "PERCENTAGE") => {
  if (!resend) return;
  
  const discountDisplay = discountType === "FIXED" ? `$${discount}` : `${discount}%`;

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Your Welcome Discount - Sharcly",
    html: baseTemplate(
      "Welcome to Sharcly!",
      `
      <p>Thank you for joining our community. As a welcome gift, here is a special discount for your first purchase.</p>
      <div style="background: #f4fdf4; padding: 30px; border-radius: 15px; text-align: center; margin: 30px 0; border: 2px dashed #062D1B;">
        <p style="text-transform: uppercase; font-weight: 900; letter-spacing: 2px; color: #062D1B; margin-bottom: 10px; font-size: 12px;">Your Discount Code</p>
        <h2 style="font-size: 42px; color: #062D1B; margin: 0; letter-spacing: 4px;">${couponCode}</h2>
        <p style="font-size: 14px; color: #062D1B; opacity: 0.6; margin-top: 10px;">Use this code for <strong>${discountDisplay} OFF</strong> your first order.</p>
      </div>
      `,
      { text: "Shop Our Collection", url: `${process.env.FRONTEND_URL}/products` }
    ),
  });
};

export const sendOtpEmail = async (email: string, otp: string) => {
  if (!resend) {
    console.error("❌ Resend client not initialized. Cannot send OTP to:", email);
    return;
  }
  
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Verification Code: ${otp} - Sharcly`,
      html: baseTemplate(
        "Verify Your Email",
        `
        <p>Use the following security code to complete your registration. For your security, please do not share this code with anyone.</p>
        <div style="background: #f4fdf4; padding: 32px; border-radius: 20px; text-align: center; margin: 24px 0;">
          <h2 style="font-size: 48px; letter-spacing: 12px; color: #062D1B; margin: 0; font-weight: 800;">${otp}</h2>
          <p style="font-size: 13px; color: #062D1B; opacity: 0.6; margin-top: 12px; font-weight: 600;">Valid for 10 minutes</p>
        </div>
        `,
        undefined,
        "If you didn't request this code, please ignore this email."
      ),
    });

    if (error) {
      console.error("❌ Resend API Error while sending OTP:", error);
    } else {
      console.log(`✅ OTP Email sent successfully to ${email}. ID: ${data?.id}`);
    }
  } catch (err) {
    console.error("❌ Unexpected Error in sendOtpEmail:", err);
  }
};

