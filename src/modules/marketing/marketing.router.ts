import { Router } from "express";
import { MarketingController } from "./marketing.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import { validate, MarketingOfferSchema, ClaimOfferSchema } from "../../common/middlewares/validate.middleware";
import { upload } from "../../common/utils/multer";

const router = Router();

// Public routes
router.get("/active-offers", MarketingController.getActiveOffers);
router.post("/claim-offer", validate(ClaimOfferSchema), MarketingController.claimOffer);
router.post("/subscribe", MarketingController.subscribeNewsletter);

// Admin routes
router.get("/offers", authenticate, authorize("admin", "manager"), MarketingController.getAllOffers);
router.post("/offers", authenticate, authorize("admin", "manager"), upload.any(), validate(MarketingOfferSchema), MarketingController.createOffer);
router.put("/offers/:id", authenticate, authorize("admin", "manager"), upload.any(), validate(MarketingOfferSchema), MarketingController.updateOffer);
router.delete("/offers/:id", authenticate, authorize("admin", "manager"), MarketingController.deleteOffer);
router.get("/claims", authenticate, authorize("admin", "manager"), MarketingController.getClaims);
router.get("/subscribers", authenticate, authorize("admin", "manager"), MarketingController.getSubscribers);
router.get("/klaviyo/status", authenticate, authorize("admin", "manager"), MarketingController.getKlaviyoStatus);

export default router;
