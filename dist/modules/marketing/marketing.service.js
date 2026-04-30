"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingService = void 0;
const prisma_1 = require("../../common/lib/prisma");
const email_service_1 = require("../auth/email.service");
const crypto_1 = __importDefault(require("crypto"));
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
                description: data.description,
                discount: data.discount,
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
                discountType: "PERCENTAGE",
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
            await (0, email_service_1.sendWelcomeCoupon)(email, couponCode, offer.discount.toString());
        }
        catch (error) {
            console.error("Failed to send welcome coupon email:", error);
        }
        return claim;
    }
    static async getClaims() {
        return await prisma_1.prisma.offerClaim.findMany({
            include: { welcomeOffer: true },
            orderBy: { createdAt: "desc" }
        });
    }
}
exports.MarketingService = MarketingService;
