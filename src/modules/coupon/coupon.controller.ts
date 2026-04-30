import { Request, Response } from "express";
import { CouponService } from "./coupon.service";

export const getCoupons = async (req: Request, res: Response) => {
  try {
    const coupons = await CouponService.getCoupons();
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch coupons" });
  }
};

export const createCoupon = async (req: Request, res: Response) => {
  try {
    const coupon = await CouponService.createCoupon(req.body);
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ message: "Failed to create coupon" });
  }
};

export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await CouponService.deleteCoupon(id as string);
    res.status(200).json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete coupon" });
  }
};

export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const result = await CouponService.validateCoupon(code as string);

    if (!result.valid) {
      const status = result.message === "Coupon not found" ? 404 : 400;
      return res.status(status).json({ message: result.message });
    }

    res.status(200).json({ 
      success: true, 
      valid: true,
      discount: result.discount, 
      discountType: result.discountType,
      code: result.code 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to validate coupon" });
  }
};
