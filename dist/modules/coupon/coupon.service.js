"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponService = void 0;
const prisma_1 = require("../../common/lib/prisma");
class CouponService {
    static async getCoupons() {
        return await prisma_1.prisma.coupon.findMany({
            orderBy: { createdAt: "desc" }
        });
    }
    static async createCoupon(couponData) {
        const { code, discount, expiryDate, usageLimit } = couponData;
        return await prisma_1.prisma.coupon.create({
            data: {
                code,
                discount,
                expiryDate: new Date(expiryDate),
                usageLimit
            }
        });
    }
    static async deleteCoupon(id) {
        return await prisma_1.prisma.coupon.delete({ where: { id } });
    }
    static async validateCoupon(code) {
        const coupon = await prisma_1.prisma.coupon.findUnique({ where: { code } });
        if (!coupon)
            return { valid: false, message: "Coupon not found" };
        if (new Date(coupon.expiryDate) < new Date()) {
            return { valid: false, message: "Coupon expired" };
        }
        if (coupon.usedCount >= coupon.usageLimit) {
            return { valid: false, message: "Coupon usage limit reached" };
        }
        return {
            valid: true,
            discount: Number(coupon.discount),
            code: coupon.code
        };
    }
}
exports.CouponService = CouponService;
