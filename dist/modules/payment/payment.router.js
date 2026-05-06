"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("./payment.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post("/webhook", (req, res, next) => {
    // We need the raw body for Stripe webhook verification
    next();
}, require("./payment.controller").handleStripeWebhook);
router.use(auth_middleware_1.authenticate);
router.get("/", payment_controller_1.getPaymentMethods);
router.delete("/:id", payment_controller_1.deletePaymentMethod);
exports.default = router;
