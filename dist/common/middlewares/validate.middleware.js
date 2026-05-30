"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUpdateUserSchema = exports.AdminCreateUserSchema = exports.CreateAddressSchema = exports.UpdateProductSchema = exports.CreateProductSchema = exports.CreateCouponSchema = exports.UpdateOrderStatusSchema = exports.CreateOrderSchema = exports.ChangePasswordSchema = exports.RegisterSchema = exports.LoginSchema = void 0;
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
    email: zod_1.z.email("Invalid email address").toLowerCase().trim(),
    password: zod_1.z.string().min(1, "Password is required"),
});
exports.RegisterSchema = zod_1.z.object({
    email: zod_1.z.email("Invalid email address").toLowerCase().trim(),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password too long")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
    name: zod_1.z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long").trim(),
});
exports.ChangePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
    newPassword: zod_1.z
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
    email: zod_1.z.email("Valid email is required for guest orders").optional(),
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
});
exports.UpdateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["PENDING", "ACCEPTED", "SHIPPED", "DELIVERED", "CANCELLED"]),
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
    status: zod_1.z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    discountable: zod_1.z
        .union([zod_1.z.boolean(), zod_1.z.string()])
        .transform((val) => val === true || val === "true")
        .default(true),
}).passthrough();
exports.UpdateProductSchema = exports.CreateProductSchema.partial();
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
    email: zod_1.z.email("Invalid email").toLowerCase().trim(),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters").max(72, "Password too long"),
    name: zod_1.z.string().min(2).max(100).trim(),
    role: zod_1.z.string().optional(),
    roleId: zod_1.z.string().optional(),
});
exports.AdminUpdateUserSchema = zod_1.z.object({
    email: zod_1.z.email("Invalid email").toLowerCase().trim().optional(),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters").max(72).optional(),
    name: zod_1.z.string().min(2).max(100).trim().optional(),
    role: zod_1.z.string().optional(),
    roleId: zod_1.z.string().optional(),
});
