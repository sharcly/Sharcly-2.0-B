import { prisma } from "../../common/lib/prisma";

export class CouponService {
  static async getCoupons() {
    return await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  static async createCoupon(couponData: any) {
    const { code, discount, discountType, expiryDate, usageLimit } = couponData;
    return await prisma.coupon.create({
      data: {
        code,
        discount,
        discountType: discountType || "PERCENTAGE",
        expiryDate: new Date(expiryDate),
        usageLimit
      }
    });
  }

  static async deleteCoupon(id: string) {
    return await prisma.coupon.delete({ where: { id } });
  }

  static async validateCoupon(code: string) {
    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon) return { valid: false, message: "Coupon not found" };

    if (new Date(coupon.expiryDate) < new Date()) {
      return { valid: false, message: "Coupon expired" };
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, message: "Coupon usage limit reached" };
    }

    return { 
      valid: true, 
      discount: Number(coupon.discount),
      discountType: coupon.discountType,
      code: coupon.code
    };
  }
}
