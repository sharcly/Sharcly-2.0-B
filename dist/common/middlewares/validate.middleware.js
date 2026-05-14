"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestimonialSchema = exports.AdminUpdateUserSchema = exports.AdminCreateUserSchema = exports.CreateAddressSchema = exports.CmsBulkUpdateSchema = exports.GlobalSeoSchema = exports.SeoUpsertSchema = exports.ClaimOfferSchema = exports.MarketingOfferSchema = exports.CreateRegionSchema = exports.StoreSettingsSchema = exports.UpdateBlogSchema = exports.CreateBlogSchema = exports.UpdateProductSchema = exports.CreateProductSchema = exports.CreateCouponSchema = exports.UpdateOrderStatusSchema = exports.CreateOrderSchema = exports.ResetPasswordSchema = exports.ForgotPasswordSchema = exports.ChangePasswordSchema = exports.RegisterSchema = exports.LoginSchema = void 0;
exports.validate = validate;
const zod_1 = require("zod");
// ─────────────────────────────────────────────────────
// Generic validation middleware factory
// ─────────────────────────────────────────────────────
function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map((e) => ({
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
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address").toLowerCase().trim(),
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address").toLowerCase().trim(),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password too long")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
    name: zod_1.z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long").trim(),
    otp: zod_1.z.string().length(6, "Verification code must be 6 digits"),
});
exports.ChangePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
    newPassword: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password too long")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
});
exports.ForgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email address").toLowerCase().trim(),
});
exports.ResetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, "Token is required"),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password too long")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
});
// ─────────────────────────────────────────────────────
// ORDER SCHEMAS
// ─────────────────────────────────────────────────────
const AddressSchema = zod_1.z.union([
    zod_1.z.string().min(5, "Address is too short"),
    zod_1.z.object({
        street: zod_1.z.string().min(3, "Street is required"),
        city: zod_1.z.string().min(2, "City is required"),
        state: zod_1.z.string().min(2, "State is required"),
        zipCode: zod_1.z.string().min(3, "Zip code is required"),
        country: zod_1.z.string().min(2, "Country is required"),
    }),
]);
exports.CreateOrderSchema = zod_1.z.object({
    email: zod_1.z.string().email("Valid email is required for guest orders").optional(),
    items: zod_1.z
        .array(zod_1.z.object({
        productId: zod_1.z.string().uuid("Invalid product ID"),
        quantity: zod_1.z.number().int().min(1, "Quantity must be at least 1").max(100, "Quantity too large"),
    }))
        .min(1, "Order must have at least one item"),
    shippingAddress: AddressSchema,
    billingAddress: AddressSchema.optional(),
    paymentMethod: zod_1.z.string().min(1, "Payment method is required").optional(),
    couponCode: zod_1.z.string().max(50, "Coupon code too long").optional(),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters").optional(),
    name: zod_1.z.string().max(100).optional(),
});
exports.UpdateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]),
    trackingNumber: zod_1.z.string().max(100).optional(),
    carrier: zod_1.z.string().max(100).optional(),
    estimatedDelivery: zod_1.z.string().optional(),
    notes: zod_1.z.string().max(500).optional(),
});
// ─────────────────────────────────────────────────────
// COUPON SCHEMAS
// ─────────────────────────────────────────────────────
exports.CreateCouponSchema = zod_1.z.object({
    code: zod_1.z
        .string()
        .min(3, "Code must be at least 3 characters")
        .max(50, "Code too long")
        .trim()
        .regex(/^[A-Z0-9_-]+$/i, "Code can only contain letters, numbers, hyphens, and underscores")
        .transform((v) => v.toUpperCase()),
    discount: zod_1.z
        .number()
        .positive("Discount must be positive")
        .max(10000, "Discount amount too large"),
    expiryDate: zod_1.z.string().min(1, "Expiry date is required"),
    usageLimit: zod_1.z
        .number()
        .int("Usage limit must be an integer")
        .positive("Usage limit must be positive")
        .max(100000, "Usage limit too large")
        .default(1),
});
// ─────────────────────────────────────────────────────
// PRODUCT SCHEMAS
// ─────────────────────────────────────────────────────
exports.CreateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters").max(255, "Name too long").trim(),
    slug: zod_1.z.string().max(255).trim().optional(),
    subtitle: zod_1.z.string().max(500).trim().optional(),
    sku: zod_1.z.string().max(100).trim().optional(),
    description: zod_1.z.string().min(10, "Description must be at least 10 characters").trim(),
    price: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((val) => parseFloat(String(val)))
        .refine((val) => !isNaN(val) && val >= 0, "Price must be a valid positive number")
        .refine((val) => val <= 1000000, "Price too large"),
    stock: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((val) => parseInt(String(val)))
        .refine((val) => !isNaN(val) && val >= 0, "Stock must be a valid non-negative integer")
        .optional()
        .default(0),
    categoryId: zod_1.z.string().uuid("Invalid category ID"),
    status: zod_1.z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    discountable: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.string()])
        .transform((val) => val === true || val === "true")
        .default(true),
    // Additional fields (added to prevent stripping by zod)
    typeId: zod_1.z.string().optional().nullable(),
    tags: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    collections: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    variants: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.any())]).optional(),
    options: zod_1.z.union([zod_1.z.string(), zod_1.z.any()]).optional(),
    metadata: zod_1.z.union([zod_1.z.string(), zod_1.z.any()]).optional(),
    weight: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().nullable(),
    length: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().nullable(),
    height: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().nullable(),
    width: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional().nullable(),
    originCountry: zod_1.z.string().optional().nullable(),
    material: zod_1.z.string().optional().nullable(),
    hsCode: zod_1.z.string().optional().nullable(),
    midCode: zod_1.z.string().optional().nullable(),
    metaTitle: zod_1.z.string().optional().nullable(),
    metaDescription: zod_1.z.string().optional().nullable(),
    keywords: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    canonicalUrl: zod_1.z.string().optional().nullable(),
    ogImage: zod_1.z.string().optional().nullable(),
    changefreq: zod_1.z.string().optional().nullable(),
    featured: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.string()])
        .transform((val) => val === true || val === "true")
        .optional(),
    flavours: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    imageOrder: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    faqs: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.any())]).optional(),
    contentSections: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.any())]).optional(),
    statement: zod_1.z.union([zod_1.z.string(), zod_1.z.any()]).optional(),
});
exports.UpdateProductSchema = exports.CreateProductSchema.partial();
// ─────────────────────────────────────────────────────
// BLOG SCHEMAS
// ─────────────────────────────────────────────────────
exports.CreateBlogSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, "Title too short").max(255).trim(),
    slug: zod_1.z.string().max(255).trim().optional(),
    content: zod_1.z.string().min(10, "Content too short"),
    excerpt: zod_1.z.string().max(500).trim().optional(),
    featuredImage: zod_1.z.any().optional(),
    category: zod_1.z.string().max(100).trim().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    metaTitle: zod_1.z.string().max(255).optional(),
    metaDescription: zod_1.z.string().max(500).optional(),
});
exports.UpdateBlogSchema = exports.CreateBlogSchema.partial();
// ─────────────────────────────────────────────────────
// SETTINGS SCHEMAS
// ─────────────────────────────────────────────────────
exports.StoreSettingsSchema = zod_1.z.object({
    storeName: zod_1.z.string().min(1).max(100).optional(),
    supportEmail: zod_1.z.string().email().optional(),
    currency: zod_1.z.string().length(3).optional(),
    logoUrl: zod_1.z.string().url().optional().or(zod_1.z.string().length(0)),
    primaryColor: zod_1.z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    secondaryColor: zod_1.z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    siteTheme: zod_1.z.enum(["light", "dark", "system"]).optional(),
    navbarStyle: zod_1.z.enum(["transparent", "solid", "glass"]).optional(),
    buttonRadius: zod_1.z.string().max(20).optional(),
    taxRate: zod_1.z.number().min(0).max(100).optional(),
    shippingCharge: zod_1.z.number().min(0).optional(),
    freeShippingThreshold: zod_1.z.number().min(0).optional(),
});
exports.CreateRegionSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    currencyCode: zod_1.z.string().length(3),
    taxRate: zod_1.z.number().min(0).max(100).default(0),
    countries: zod_1.z.array(zod_1.z.string()).min(1),
});
// ─────────────────────────────────────────────────────
// MARKETING SCHEMAS
// ─────────────────────────────────────────────────────
exports.MarketingOfferSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required").max(200),
    subtitle: zod_1.z.string().max(200).optional().nullable().transform(v => v === "" ? null : v),
    description: zod_1.z.string().min(1, "Description is required"),
    discount: zod_1.z
        .union([zod_1.z.string(), zod_1.z.number()])
        .transform((val) => {
        const parsed = parseFloat(String(val));
        return isNaN(parsed) ? 0 : parsed;
    })
        .refine((val) => val > 0, "Discount must be a positive number"),
    discountType: zod_1.z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    image: zod_1.z.string().optional().nullable().transform(v => v === "" ? null : v),
    options: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.any())]).optional().transform((val) => {
        if (!val)
            return [];
        if (typeof val === 'string') {
            try {
                return JSON.parse(val);
            }
            catch (e) {
                return [];
            }
        }
        return val;
    }),
    step2Title: zod_1.z.string().max(200).optional().nullable().transform(v => v === "" ? null : v),
    step2Text: zod_1.z.string().max(500).optional().nullable().transform(v => v === "" ? null : v),
    footerText: zod_1.z.string().max(100).optional().nullable().transform(v => v === "" ? null : v),
    isActive: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.string()])
        .transform((val) => val === true || val === "true" || val === "1")
        .default(true),
});
exports.ClaimOfferSchema = zod_1.z.object({
    offerId: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(8),
});
// ─────────────────────────────────────────────────────
// SEO SCHEMAS
// ─────────────────────────────────────────────────────
exports.SeoUpsertSchema = zod_1.z.object({
    pageSlug: zod_1.z.string().min(1).max(255),
    title: zod_1.z.string().max(255).optional(),
    description: zod_1.z.string().max(500).optional(),
    keywords: zod_1.z.string().max(500).optional(),
    ogTitle: zod_1.z.string().max(255).optional(),
    ogDescription: zod_1.z.string().max(500).optional(),
    ogImage: zod_1.z.string().url().optional().or(zod_1.z.string().length(0)),
    canonicalUrl: zod_1.z.string().url().optional().or(zod_1.z.string().length(0)),
    robots: zod_1.z.string().max(100).optional(),
    structuredData: zod_1.z.string().optional(),
});
exports.GlobalSeoSchema = zod_1.z.object({
    siteName: zod_1.z.string().max(100).optional(),
    siteDescription: zod_1.z.string().max(500).optional(),
    googleAnalyticsId: zod_1.z.string().max(50).optional(),
    facebookPixelId: zod_1.z.string().max(50).optional(),
    klaviyoPublicKey: zod_1.z.string().max(100).optional(),
    klaviyoPrivateKey: zod_1.z.string().max(100).optional(),
    robotsTxt: zod_1.z.string().optional(),
});
// ─────────────────────────────────────────────────────
// CMS SCHEMAS
// ─────────────────────────────────────────────────────
exports.CmsBulkUpdateSchema = zod_1.z.object({
    page: zod_1.z.string().min(1),
    updates: zod_1.z.array(zod_1.z.object({
        section: zod_1.z.string().min(1),
        key: zod_1.z.string().min(1),
        value: zod_1.z.string(),
        type: zod_1.z.string().optional().default("text")
    })).min(1)
});
// ─────────────────────────────────────────────────────
// ADDRESS SCHEMAS
// ─────────────────────────────────────────────────────
exports.CreateAddressSchema = zod_1.z.object({
    street: zod_1.z.string().min(3, "Street too short").max(255).trim(),
    city: zod_1.z.string().min(2, "City too short").max(100).trim(),
    state: zod_1.z.string().min(2, "State too short").max(100).trim(),
    zipCode: zod_1.z.string().min(3, "Zip code too short").max(20).trim(),
    country: zod_1.z.string().min(2, "Country too short").max(100).trim(),
    isDefault: zod_1.z.boolean().default(false),
});
// ─────────────────────────────────────────────────────
// ADMIN USER SCHEMAS
// ─────────────────────────────────────────────────────
exports.AdminCreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email").toLowerCase().trim(),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters").max(72, "Password too long"),
    name: zod_1.z.string().min(2).max(100).trim(),
    role: zod_1.z.string().optional(),
    roleId: zod_1.z.string().optional(),
});
exports.AdminUpdateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email").toLowerCase().trim().optional(),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters").max(72).optional(),
    name: zod_1.z.string().min(2).max(100).trim().optional(),
    role: zod_1.z.string().optional(),
    roleId: zod_1.z.string().optional(),
});
// ─────────────────────────────────────────────────────
// TESTIMONIAL SCHEMAS
// ─────────────────────────────────────────────────────
exports.TestimonialSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters").max(100),
    role: zod_1.z.string().min(2, "Role must be at least 2 characters").max(100),
    company: zod_1.z.string().max(100).optional().nullable(),
    message: zod_1.z.string().min(10, "Message must be at least 10 characters"),
    rating: zod_1.z.number().int().min(1).max(5).optional().nullable(),
    image: zod_1.z.string().url().optional().nullable().or(zod_1.z.string().length(0)),
    featured: zod_1.z.boolean().default(false),
});
