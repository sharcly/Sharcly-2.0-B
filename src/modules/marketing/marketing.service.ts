import { prisma } from "../../common/lib/prisma";
import { sendWelcomeCoupon } from "../auth/email.service";
import crypto from "crypto";
import { KlaviyoService } from "./klaviyo.service";
import { SeoService } from "../seo/seo.service";

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
        discountType: offer.discountType as any,
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
      await sendWelcomeCoupon(email, couponCode, offer.discount.toString(), offer.discountType);
    } catch (error) {
      console.error("Failed to send welcome coupon email:", error);
    }
    
    // 7. Klaviyo Sync & Event Tracking
    try {
      const seoSettings = await SeoService.getGlobalSettings();
      KlaviyoService.init(seoSettings?.klaviyoPrivateKey || undefined);
      
      // Sync Profile
      await KlaviyoService.syncProfile({ email, phone });
      
      // Track Event
      await KlaviyoService.trackEvent(email, "Claimed Welcome Offer", {
        "OfferTitle": offer.title,
        "CouponCode": couponCode,
        "Discount": offer.discount,
        "DiscountType": offer.discountType
      });
    } catch (kErr) {
      console.warn("Klaviyo Offer Claim Tracking Failed:", kErr);
    }

    return claim;
  }

  static async getClaims() {
    return await prisma.offerClaim.findMany({
      include: { welcomeOffer: true },
      orderBy: { createdAt: "desc" }
    });
  }

  static async subscribeNewsletter(email: string) {
    // 1. Check if already subscribed in local DB
    const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email }
    });

    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        throw new Error("You are already subscribed to our newsletter.");
      } else {
        // Reactivate
        await prisma.newsletterSubscriber.update({
          where: { email },
          data: { isActive: true }
        });
      }
    } else {
      // Create new subscriber
      await prisma.newsletterSubscriber.create({
        data: { email }
      });
    }

    // 2. Klaviyo Sync
    try {
      const seoSettings = await SeoService.getGlobalSettings();
      KlaviyoService.init(seoSettings?.klaviyoPrivateKey || undefined);
      
      // Add to list
      await KlaviyoService.subscribeToList(email, seoSettings?.klaviyoPublicKey || undefined);
      
      // Track event
      await KlaviyoService.trackEvent(email, "Subscribed to Newsletter", {
        "Source": "Footer Community Form"
      });
    } catch (kErr) {
      console.warn("Klaviyo Newsletter Sync Failed:", kErr);
    }

    return { email, success: true };
  }

  static async getSubscribers() {
    return await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" }
    });
  }
}
