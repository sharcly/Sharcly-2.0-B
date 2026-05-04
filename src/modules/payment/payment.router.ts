import { Router } from "express";
import { getPaymentMethods, deletePaymentMethod } from "./payment.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";

const router = Router();

router.post("/webhook", (req, res, next) => {
    // We need the raw body for Stripe webhook verification
    next();
}, require("./payment.controller").handleStripeWebhook);

router.use(authenticate);

router.get("/", getPaymentMethods);
router.delete("/:id", deletePaymentMethod);

export default router;
