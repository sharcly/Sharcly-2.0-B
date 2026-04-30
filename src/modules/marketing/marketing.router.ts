import { Router } from "express";
import { MarketingController } from "./marketing.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

// Public routes
router.get("/active-offers", MarketingController.getActiveOffers);
router.post("/claim-offer", MarketingController.claimOffer);

// Admin routes
router.get("/offers", authenticate, authorize(["admin", "manager"]), MarketingController.getAllOffers);
router.post("/offers", authenticate, authorize(["admin", "manager"]), MarketingController.createOffer);
router.put("/offers/:id", authenticate, authorize(["admin", "manager"]), MarketingController.updateOffer);
router.delete("/offers/:id", authenticate, authorize(["admin", "manager"]), MarketingController.deleteOffer);
router.get("/claims", authenticate, authorize(["admin", "manager"]), MarketingController.getClaims);

export default router;
