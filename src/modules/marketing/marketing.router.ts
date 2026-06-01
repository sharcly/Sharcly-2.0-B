import { Router } from "express";
import { MarketingController } from "./marketing.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

// Public routes
router.get("/active-offers", MarketingController.getActiveOffers);
router.post("/claim-offer", MarketingController.claimOffer);
router.post("/subscribe", MarketingController.subscribe);

// Admin routes
router.get("/offers", authenticate, authorize("admin", "manager", "seo manager", "seo.manage", "cms.manage"), MarketingController.getAllOffers);
router.post("/offers", authenticate, authorize("admin", "manager", "seo manager", "seo.manage", "cms.manage"), MarketingController.createOffer);
router.put("/offers/:id", authenticate, authorize("admin", "manager", "seo manager", "seo.manage", "cms.manage"), MarketingController.updateOffer);
router.delete("/offers/:id", authenticate, authorize("admin", "manager", "seo manager", "seo.manage", "cms.manage"), MarketingController.deleteOffer);
router.get("/claims", authenticate, authorize("admin", "manager", "seo manager", "seo.manage", "cms.manage"), MarketingController.getClaims);
router.get("/subscribers", authenticate, authorize("admin", "manager", "seo manager", "seo.manage", "cms.manage"), MarketingController.getSubscribers);

export default router;
