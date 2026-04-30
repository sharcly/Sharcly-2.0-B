"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoupon = exports.deleteCoupon = exports.createCoupon = exports.getCoupons = void 0;
const coupon_service_1 = require("./coupon.service");
const getCoupons = async (req, res) => {
    try {
        const coupons = await coupon_service_1.CouponService.getCoupons();
        res.status(200).json({ success: true, coupons });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch coupons" });
    }
};
exports.getCoupons = getCoupons;
const createCoupon = async (req, res) => {
    try {
        const coupon = await coupon_service_1.CouponService.createCoupon(req.body);
        res.status(201).json({ success: true, coupon });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create coupon" });
    }
};
exports.createCoupon = createCoupon;
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await coupon_service_1.CouponService.deleteCoupon(id);
        res.status(200).json({ success: true, message: "Coupon deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete coupon" });
    }
};
exports.deleteCoupon = deleteCoupon;
const validateCoupon = async (req, res) => {
    try {
        const { code } = req.params;
        const result = await coupon_service_1.CouponService.validateCoupon(code);
        if (!result.valid) {
            const status = result.message === "Coupon not found" ? 404 : 400;
            return res.status(status).json({ message: result.message });
        }
        res.status(200).json({ success: true, discount: result.discount, code: result.code });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to validate coupon" });
    }
};
exports.validateCoupon = validateCoupon;
