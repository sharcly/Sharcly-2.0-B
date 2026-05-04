import { Resend } from "resend";
import { InvoiceService } from "../order/invoice.service";
import { Readable } from "stream";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey || apiKey === "re_...") {
  console.warn("⚠️  RESEND_API_KEY is missing or invalid. Email services will be disabled.");
}

const resend = apiKey && apiKey !== "re_..." ? new Resend(apiKey) : null;
const fromEmail = "Sharcly <onboarding@resend.dev>";
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
        <p style="color: #999; font-size: 12px;">${footer || "© 2024 Sharcly Essentials. Pure. Lab Verified."}</p>
      </div>
    </div>
  </div>
`;

export const sendVerificationEmail = async (email: string, token: string) => {
  if (!resend) return;
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  await resend.emails.send({
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
      html: baseTemplate(
        "Order Status Updated",
        `
        <p>Your order <strong>#${order.id.slice(0, 8)}</strong> has a new update.</p>
        <div style="background: #f4fdf4; padding: 24px; border-radius: 16px; margin: 20px 0; border: 1px solid #e0f2e0;">
          <p style="margin: 0; color: #062D1B; font-weight: 700; font-size: 18px;">${order.status}</p>
        </div>
        ${order.trackingNumber ? `
          <div style="text-align: left; margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 12px;">
            <p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
            <p style="margin: 5px 0;"><strong>Carrier:</strong> ${order.carrier}</p>
          </div>
        ` : ""}
        <p>Click the button below to see the full details of your order.</p>
        `,
        { text: "Track My Order", url: `${process.env.FRONTEND_URL}/account` }
      ),
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
  if (!resend) return;
  
  await resend.emails.send({
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
};

