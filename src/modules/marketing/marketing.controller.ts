import { Request, Response } from "express";
import { MarketingService } from "./marketing.service";

export class MarketingController {
  static async getActiveOffers(req: Request, res: Response) {
    try {
      const offers = await MarketingService.getActiveOffers();
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getAllOffers(req: Request, res: Response) {
    try {
      const offers = await MarketingService.getAllOffers();
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async createOffer(req: Request, res: Response) {
    try {
      const offer = await MarketingService.createOffer(req.body);
      res.status(201).json(offer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updateOffer(req: Request, res: Response) {
    try {
      const offer = await MarketingService.updateOffer(req.params.id, req.body);
      res.json(offer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async deleteOffer(req: Request, res: Response) {
    try {
      await MarketingService.deleteOffer(req.params.id);
      res.json({ message: "Offer deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async claimOffer(req: Request, res: Response) {
    try {
      const { offerId, email, phone } = req.body;
      const claim = await MarketingService.claimOffer(offerId, email, phone);
      res.json({ 
        message: "Coupon sent to your email!",
        claim 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getClaims(req: Request, res: Response) {
    try {
      const claims = await MarketingService.getClaims();
      res.json(claims);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
