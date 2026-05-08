import { z } from "zod";
import { Request, Response, NextFunction } from "express";

// ─────────────────────────────────────────────────────
// Generic validation middleware factory
// ─────────────────────────────────────────────────────
export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = (result.error as any).issues.map((e: any) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }
    req.body = result.data;
    next();
  };
}

// ─────────────────────────────────────────────────────
// AUTH SCHEMAS
// ─────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long").trim(),
  otp: z.string().length(6, "Verification code must be 6 digits"),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

// ─────────────────────────────────────────────────────
// ORDER SCHEMAS
// ─────────────────────────────────────────────────────
const AddressSchema = z.union([
  z.string().min(5, "Address is too short"),
  z.object({
    street: z.string().min(3, "Street is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zipCode: z.string().min(3, "Zip code is required"),
    country: z.string().min(2, "Country is required"),
  }),
]);

export const CreateOrderSchema = z.object({
  email: z.email("Valid email is required for guest orders").optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid("Invalid product ID"),
        quantity: z.number().int().min(1, "Quantity must be at least 1").max(100, "Quantity too large"),
      })
    )
    .min(1, "Order must have at least one item"),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema.optional(),
  paymentMethod: z.string().min(1, "Payment method is required").optional(),
  couponCode: z.string().max(50, "Coupon code too long").optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  trackingNumber: z.string().max(100).optional(),
  carrier: z.string().max(100).optional(),
  estimatedDelivery: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// ─────────────────────────────────────────────────────
// COUPON SCHEMAS
// ─────────────────────────────────────────────────────
export const CreateCouponSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(50, "Code too long")
    .trim()
    .regex(/^[A-Z0-9_-]+$/i, "Code can only contain letters, numbers, hyphens, and underscores")
    .transform((v) => v.toUpperCase()),
  discount: z
    .number()
    .positive("Discount must be positive")
    .max(10000, "Discount amount too large"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  usageLimit: z
    .number()
    .int("Usage limit must be an integer")
    .positive("Usage limit must be positive")
    .max(100000, "Usage limit too large")
    .default(1),
});

// ─────────────────────────────────────────────────────
// PRODUCT SCHEMAS
// ─────────────────────────────────────────────────────
export const CreateProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255, "Name too long").trim(),
  slug: z.string().max(255).trim().optional(),
  subtitle: z.string().max(500).trim().optional(),
  sku: z.string().max(100).trim().optional(),
  description: z.string().min(10, "Description must be at least 10 characters").trim(),
  price: z
    .union([z.string(), z.number()])
    .transform((val) => parseFloat(String(val)))
    .refine((val) => !isNaN(val) && val >= 0, "Price must be a valid positive number")
    .refine((val) => val <= 1000000, "Price too large"),
  stock: z
    .union([z.string(), z.number()])
    .transform((val) => parseInt(String(val)))
    .refine((val) => !isNaN(val) && val >= 0, "Stock must be a valid non-negative integer")
    .optional()
    .default(0),
  categoryId: z.string().uuid("Invalid category ID"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  discountable: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true")
    .default(true),
  // Additional fields (added to prevent stripping by zod)
  typeId: z.string().optional().nullable(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  collections: z.union([z.string(), z.array(z.string())]).optional(),
  variants: z.union([z.string(), z.array(z.any())]).optional(),
  options: z.union([z.string(), z.any()]).optional(),
  metadata: z.union([z.string(), z.any()]).optional(),
  weight: z.union([z.string(), z.number()]).optional().nullable(),
  length: z.union([z.string(), z.number()]).optional().nullable(),
  height: z.union([z.string(), z.number()]).optional().nullable(),
  width: z.union([z.string(), z.number()]).optional().nullable(),
  originCountry: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  hsCode: z.string().optional().nullable(),
  midCode: z.string().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
  canonicalUrl: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  changefreq: z.string().optional().nullable(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

// ─────────────────────────────────────────────────────
// BLOG SCHEMAS
// ─────────────────────────────────────────────────────
export const CreateBlogSchema = z.object({
  title: z.string().min(3, "Title too short").max(255).trim(),
  slug: z.string().max(255).trim().optional(),
  content: z.string().min(10, "Content too short"),
  excerpt: z.string().max(500).trim().optional(),
  featuredImage: z.any().optional(),
  category: z.string().max(100).trim().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
});

export const UpdateBlogSchema = CreateBlogSchema.partial();

// ─────────────────────────────────────────────────────
// SETTINGS SCHEMAS
// ─────────────────────────────────────────────────────
export const StoreSettingsSchema = z.object({
  storeName: z.string().min(1).max(100).optional(),
  supportEmail: z.string().email().optional(),
  currency: z.string().length(3).optional(),
  logoUrl: z.string().url().optional().or(z.string().length(0)),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  siteTheme: z.enum(["light", "dark", "system"]).optional(),
  navbarStyle: z.enum(["transparent", "solid", "glass"]).optional(),
  buttonRadius: z.string().max(20).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  shippingCharge: z.number().min(0).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
});

export const CreateRegionSchema = z.object({
  name: z.string().min(2).max(100),
  currencyCode: z.string().length(3),
  taxRate: z.number().min(0).max(100).default(0),
  countries: z.array(z.string()).min(1),
});

// ─────────────────────────────────────────────────────
// MARKETING SCHEMAS
// ─────────────────────────────────────────────────────
export const MarketingOfferSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  subtitle: z.string().max(200).optional().nullable().transform(v => v === "" ? null : v),
  description: z.string().min(1, "Description is required"),
  discount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const parsed = parseFloat(String(val));
      return isNaN(parsed) ? 0 : parsed;
    })
    .refine((val) => val > 0, "Discount must be a positive number"),
  discountType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
  image: z.string().optional().nullable().transform(v => v === "" ? null : v),
  options: z.union([z.string(), z.array(z.any())]).optional().transform((val) => {
    if (!val) return [];
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val;
  }),
  step2Title: z.string().max(200).optional().nullable().transform(v => v === "" ? null : v),
  step2Text: z.string().max(500).optional().nullable().transform(v => v === "" ? null : v),
  footerText: z.string().max(100).optional().nullable().transform(v => v === "" ? null : v),
  isActive: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true" || val === "1")
    .default(true),
});

export const ClaimOfferSchema = z.object({
  offerId: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().min(8),
});

// ─────────────────────────────────────────────────────
// SEO SCHEMAS
// ─────────────────────────────────────────────────────
export const SeoUpsertSchema = z.object({
  pageSlug: z.string().min(1).max(255),
  title: z.string().max(255).optional(),
  description: z.string().max(500).optional(),
  keywords: z.string().max(500).optional(),
  ogTitle: z.string().max(255).optional(),
  ogDescription: z.string().max(500).optional(),
  ogImage: z.string().url().optional().or(z.string().length(0)),
  canonicalUrl: z.string().url().optional().or(z.string().length(0)),
  robots: z.string().max(100).optional(),
  structuredData: z.string().optional(),
});

export const GlobalSeoSchema = z.object({
  siteName: z.string().max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  googleAnalyticsId: z.string().max(50).optional(),
  facebookPixelId: z.string().max(50).optional(),
  klaviyoPublicKey: z.string().max(100).optional(),
  klaviyoPrivateKey: z.string().max(100).optional(),
  robotsTxt: z.string().optional(),
});

// ─────────────────────────────────────────────────────
// CMS SCHEMAS
// ─────────────────────────────────────────────────────
export const CmsBulkUpdateSchema = z.object({
  page: z.string().min(1),
  updates: z.array(z.object({
    section: z.string().min(1),
    key: z.string().min(1),
    value: z.string(),
    type: z.string().optional().default("text")
  })).min(1)
});

// ─────────────────────────────────────────────────────
// ADDRESS SCHEMAS
// ─────────────────────────────────────────────────────
export const CreateAddressSchema = z.object({
  street: z.string().min(3, "Street too short").max(255).trim(),
  city: z.string().min(2, "City too short").max(100).trim(),
  state: z.string().min(2, "State too short").max(100).trim(),
  zipCode: z.string().min(3, "Zip code too short").max(20).trim(),
  country: z.string().min(2, "Country too short").max(100).trim(),
  isDefault: z.boolean().default(false),
});

// ─────────────────────────────────────────────────────
// ADMIN USER SCHEMAS
// ─────────────────────────────────────────────────────
export const AdminCreateUserSchema = z.object({
  email: z.string().email("Invalid email").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password too long"),
  name: z.string().min(2).max(100).trim(),
  role: z.string().optional(),
  roleId: z.string().optional(),
});

export const AdminUpdateUserSchema = z.object({
  email: z.string().email("Invalid email").toLowerCase().trim().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72).optional(),
  name: z.string().min(2).max(100).trim().optional(),
  role: z.string().optional(),
  roleId: z.string().optional(),
});

// ─────────────────────────────────────────────────────
// TESTIMONIAL SCHEMAS
// ─────────────────────────────────────────────────────
export const TestimonialSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  role: z.string().min(2, "Role must be at least 2 characters").max(100),
  company: z.string().max(100).optional().nullable(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  image: z.string().url().optional().nullable().or(z.string().length(0)),
  featured: z.boolean().default(false),
});
