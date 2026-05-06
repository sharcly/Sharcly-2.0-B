"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const marketing_controller_1 = require("./marketing.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const validate_middleware_1 = require("../../common/middlewares/validate.middleware");
const multer_1 = require("../../common/utils/multer");
const router = (0, express_1.Router)();
// Public routes
router.get("/active-offers", marketing_controller_1.MarketingController.getActiveOffers);
router.post("/claim-offer", (0, validate_middleware_1.validate)(validate_middleware_1.ClaimOfferSchema), marketing_controller_1.MarketingController.claimOffer);
router.post("/subscribe", marketing_controller_1.MarketingController.subscribeNewsletter);
// Admin routes
router.get("/offers", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), marketing_controller_1.MarketingController.getAllOffers);
router.post("/offers", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), multer_1.upload.any(), (0, validate_middleware_1.validate)(validate_middleware_1.MarketingOfferSchema), marketing_controller_1.MarketingController.createOffer);
router.put("/offers/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), multer_1.upload.any(), (0, validate_middleware_1.validate)(validate_middleware_1.MarketingOfferSchema), marketing_controller_1.MarketingController.updateOffer);
router.delete("/offers/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), marketing_controller_1.MarketingController.deleteOffer);
router.get("/claims", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), marketing_controller_1.MarketingController.getClaims);
router.get("/subscribers", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), marketing_controller_1.MarketingController.getSubscribers);
exports.default = router;
