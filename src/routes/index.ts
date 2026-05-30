import { Router } from "express";
import authRoutes from "../modules/auth/auth.router";
import productRoutes from "../modules/product/product.router";
import orderRoutes from "../modules/order/order.router";
import blogRoutes from "../modules/blog/blog.router";
import couponRoutes from "../modules/coupon/coupon.router";
import adminRoutes from "../modules/admin/admin.router";
import statsRoutes from "../modules/stats/stats.router";
import settingsRoutes from "../modules/settings/settings.router";
import imageRoutes from "../modules/image/image.router";
import cmsRoutes from "../modules/cms/cms.router";
import seoRoutes from "../modules/seo/seo.router";
import shippingRoutes from "../modules/shipping/shipping.router";
import wholesaleRoutes from "../modules/wholesale/wholesale.router";
import searchRoutes from "../modules/search/search.router";
import addressRoutes from "../modules/address/address.router";
import marketingRoutes from "../modules/marketing/marketing.router";

const router = Router();

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/blogs", blogRoutes);
router.use("/coupons", couponRoutes);
router.use("/admin", adminRoutes);
router.use("/stats", statsRoutes);
router.use("/settings", settingsRoutes);
router.use("/images", imageRoutes);
router.use("/cms", cmsRoutes);
router.use("/seo", seoRoutes);
router.use("/shipping", shippingRoutes);
router.use("/wholesale", wholesaleRoutes);
router.use("/search", searchRoutes);
router.use("/addresses", addressRoutes);
router.use("/marketing", marketingRoutes);

export default router;
