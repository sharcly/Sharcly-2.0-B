import { prisma } from "../../common/lib/prisma";
import { sendWelcomeCoupon } from "../auth/email.service";
import crypto from "crypto";

export class MarketingService {
  static async getActiveOffers() {
    return await prisma.welcomeOffer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
  }

  static async getAllOffers() {
    return await prisma.welcomeOffer.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  static async createOffer(data: any) {
    return await prisma.welcomeOffer.create({
      data: {
        title: data.title,
        description: data.description,
        discount: data.discount,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  }

  static async updateOffer(id: string, data: any) {
    return await prisma.welcomeOffer.update({
      where: { id },
      data
    });
  }

  static async deleteOffer(id: string) {
    return await prisma.welcomeOffer.delete({ where: { id } });
  }

  static async claimOffer(offerId: string, email: string, phone: string) {
    // 1. Check if email already claimed
    const existingClaim = await prisma.offerClaim.findUnique({
      where: { email }
    });

    if (existingClaim) {
      throw new Error("This email has already claimed a welcome offer.");
    }

    // 2. Get the offer
    const offer = await prisma.welcomeOffer.findUnique({
      where: { id: offerId }
    });

    if (!offer || !offer.isActive) {
      throw new Error("Offer not found or inactive.");
    }

    // 3. Generate a unique coupon code
    const couponCode = `WELCOME-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    
    // 4. Create the coupon
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1); // Valid for 1 month

    await prisma.coupon.create({
      data: {
        code: couponCode,
        discount: offer.discount,
        discountType: "PERCENTAGE",
        expiryDate,
        usageLimit: 1
      }
    });

    // 5. Create the claim
    const claim = await prisma.offerClaim.create({
      data: {
        welcomeOfferId: offerId,
        email,
        phone,
        couponCode
      }
    });

    // 6. Send email
    try {
      await sendWelcomeCoupon(email, couponCode, offer.discount.toString());
    } catch (error) {
      console.error("Failed to send welcome coupon email:", error);
    }

    return claim;
  }

  static async getClaims() {
    return await prisma.offerClaim.findMany({
      include: { welcomeOffer: true },
      orderBy: { createdAt: "desc" }
    });
  }
}
