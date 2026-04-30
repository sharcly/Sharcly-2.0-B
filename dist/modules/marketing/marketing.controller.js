"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingController = void 0;
const marketing_service_1 = require("./marketing.service");
class MarketingController {
    static async getActiveOffers(req, res) {
        try {
            const offers = await marketing_service_1.MarketingService.getActiveOffers();
            res.json(offers);
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async getAllOffers(req, res) {
        try {
            const offers = await marketing_service_1.MarketingService.getAllOffers();
            res.json(offers);
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async createOffer(req, res) {
        try {
            const offer = await marketing_service_1.MarketingService.createOffer(req.body);
            res.status(201).json(offer);
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async updateOffer(req, res) {
        try {
            const offer = await marketing_service_1.MarketingService.updateOffer(req.params.id, req.body);
            res.json(offer);
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async deleteOffer(req, res) {
        try {
            await marketing_service_1.MarketingService.deleteOffer(req.params.id);
            res.json({ message: "Offer deleted successfully" });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async claimOffer(req, res) {
        try {
            const { offerId, email, phone } = req.body;
            const claim = await marketing_service_1.MarketingService.claimOffer(offerId, email, phone);
            res.json({
                message: "Coupon sent to your email!",
                claim
            });
        }
        catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
    static async getClaims(req, res) {
        try {
            const claims = await marketing_service_1.MarketingService.getClaims();
            res.json(claims);
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}
exports.MarketingController = MarketingController;
