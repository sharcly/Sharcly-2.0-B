import { Router } from "express";
import {
  getPaymentMethods,
  deletePaymentMethod,
  handleStripeWebhook,
  getActiveStripeKey,
} from "./payment.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";

const router = Router();

// ✅ Stripe Webhook — must be BEFORE authenticate
// Raw body is already applied at index.ts level for this path
router.post("/webhook", handleStripeWebhook);

// ✅ Public route to retrieve publishable key and active gateway ID for checkout mount
router.get("/active-key", getActiveStripeKey);

// All other payment routes require authentication
router.use(authenticate);

router.get("/", getPaymentMethods);
router.delete("/:id", deletePaymentMethod);

export default router;
