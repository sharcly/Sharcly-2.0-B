"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const faq_controller_1 = require("./faq.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Public route
router.get("/", faq_controller_1.FaqController.getFaqs);
// Admin routes
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), faq_controller_1.FaqController.createFaq);
router.put("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), faq_controller_1.FaqController.updateFaq);
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), faq_controller_1.FaqController.deleteFaq);
exports.default = router;
