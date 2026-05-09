"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingService = void 0;
const prisma_1 = require("../../common/lib/prisma");
const email_service_1 = require("../auth/email.service");
const crypto_1 = __importDefault(require("crypto"));
const klaviyo_service_1 = require("./klaviyo.service");
const seo_service_1 = require("../seo/seo.service");
class MarketingService {
    static async getActiveOffers() {
        return await prisma_1.prisma.welcomeOffer.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "desc" }
        });
    }
    static async getAllOffers() {
        return await prisma_1.prisma.welcomeOffer.findMany({
            orderBy: { createdAt: "desc" }
        });
    }
    static async createOffer(data) {
        return await prisma_1.prisma.welcomeOffer.create({
            data: {
                title: data.title,
                subtitle: data.subtitle,
                description: data.description,
                discount: data.discount,
                discountType: data.discountType || "FIXED",
                image: data.image,
                options: data.options,
                step2Title: data.step2Title,
                step2Text: data.step2Text,
                footerText: data.footerText,
                isActive: data.isActive !== undefined ? data.isActive : true
            }
        });
    }
    static async updateOffer(id, data) {
        return await prisma_1.prisma.welcomeOffer.update({
            where: { id },
            data
        });
    }
    static async deleteOffer(id) {
        return await prisma_1.prisma.welcomeOffer.delete({ where: { id } });
    }
    static async claimOffer(offerId, email, phone) {
        // 1. Check if email already claimed
        const existingClaim = await prisma_1.prisma.offerClaim.findUnique({
            where: { email }
        });
        if (existingClaim) {
            throw new Error("This email has already claimed a welcome offer.");
        }
        // 2. Get the offer
        const offer = await prisma_1.prisma.welcomeOffer.findUnique({
            where: { id: offerId }
        });
        if (!offer || !offer.isActive) {
            throw new Error("Offer not found or inactive.");
        }
        // 3. Generate a unique coupon code
        const couponCode = `WELCOME-${crypto_1.default.randomBytes(3).toString("hex").toUpperCase()}`;
        // 4. Create the coupon
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1); // Valid for 1 month
        await prisma_1.prisma.coupon.create({
            data: {
                code: couponCode,
                discount: offer.discount,
                discountType: offer.discountType,
                expiryDate,
                usageLimit: 1
            }
        });
        // 5. Create the claim
        const claim = await prisma_1.prisma.offerClaim.create({
            data: {
                welcomeOfferId: offerId,
                email,
                phone,
                couponCode
            }
        });
        // 6. Send email
        try {
            await (0, email_service_1.sendWelcomeCoupon)(email, couponCode, offer.discount.toString(), offer.discountType);
        }
        catch (error) {
            console.error("Failed to send welcome coupon email:", error);
        }
        // 7. Klaviyo Sync & Event Tracking
        try {
            const seoSettings = await seo_service_1.SeoService.getGlobalSettings();
            klaviyo_service_1.KlaviyoService.init(seoSettings?.klaviyoPrivateKey || undefined);
            // Sync Profile
            await klaviyo_service_1.KlaviyoService.syncProfile({ email, phone });
            // Track Event
            await klaviyo_service_1.KlaviyoService.trackEvent(email, "Claimed Welcome Offer", {
                "OfferTitle": offer.title,
                "CouponCode": couponCode,
                "Discount": offer.discount,
                "DiscountType": offer.discountType
            });
        }
        catch (kErr) {
            console.warn("Klaviyo Offer Claim Tracking Failed:", kErr);
        }
        return claim;
    }
    static async getClaims() {
        return await prisma_1.prisma.offerClaim.findMany({
            include: { welcomeOffer: true },
            orderBy: { createdAt: "desc" }
        });
    }
    static async subscribeNewsletter(email) {
        // 1. Check if already subscribed in local DB
        const existingSubscriber = await prisma_1.prisma.newsletterSubscriber.findUnique({
            where: { email }
        });
        if (existingSubscriber) {
            if (existingSubscriber.isActive) {
                throw new Error("You are already subscribed to our newsletter.");
            }
            else {
                // Reactivate
                await prisma_1.prisma.newsletterSubscriber.update({
                    where: { email },
                    data: { isActive: true }
                });
            }
        }
        else {
            // Create new subscriber
            await prisma_1.prisma.newsletterSubscriber.create({
                data: { email }
            });
        }
        // 2. Klaviyo Sync
        try {
            const seoSettings = await seo_service_1.SeoService.getGlobalSettings();
            klaviyo_service_1.KlaviyoService.init(seoSettings?.klaviyoPrivateKey || undefined);
            // Add to list
            await klaviyo_service_1.KlaviyoService.subscribeToList(email);
            // Track event
            await klaviyo_service_1.KlaviyoService.trackEvent(email, "Subscribed to Newsletter", {
                "Source": "Footer Community Form"
            });
        }
        catch (kErr) {
            console.warn("Klaviyo Newsletter Sync Failed:", kErr);
        }
        return { email, success: true };
    }
    static async getSubscribers() {
        return await prisma_1.prisma.newsletterSubscriber.findMany({
            orderBy: { createdAt: "desc" }
        });
    }
}
exports.MarketingService = MarketingService;
