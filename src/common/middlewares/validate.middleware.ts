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
  email: z.email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const RegisterSchema = z.object({
  email: z.email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name too long").trim(),
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
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  discountable: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true")
    .default(true),
}).passthrough();

export const UpdateProductSchema = CreateProductSchema.partial();

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
  email: z.email("Invalid email").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password too long"),
  name: z.string().min(2).max(100).trim(),
  role: z.string().optional(),
  roleId: z.string().optional(),
});

export const AdminUpdateUserSchema = z.object({
  email: z.email("Invalid email").toLowerCase().trim().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(72).optional(),
  name: z.string().min(2).max(100).trim().optional(),
  role: z.string().optional(),
  roleId: z.string().optional(),
});
