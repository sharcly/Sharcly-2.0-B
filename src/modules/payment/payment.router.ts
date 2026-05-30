import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import * as PaymentController from "./payment.controller";
import { handleWebhook } from "./webhook.controller";

const router = Router();

// Public endpoints
router.get("/active-key", PaymentController.getActiveKey);
router.post("/webhook/:gateway", handleWebhook); // Public callback receiver

// Admin authenticated endpoints
router.get("/integrations", authenticate, PaymentController.getIntegrations);
router.post("/connect", authenticate, PaymentController.connectCredentials);
router.post("/disconnect", authenticate, PaymentController.disconnectGateway);
router.post("/test-connection", authenticate, PaymentController.testConnection);
router.post("/sync", authenticate, PaymentController.syncTransactions);
router.get("/audit-logs", authenticate, PaymentController.getAuditLogs);

// OAuth simulator flows
router.get("/oauth/connect/:gateway", authenticate, PaymentController.oauthConnect);
router.get("/oauth/consent/:gateway", PaymentController.oauthConsentPage);
router.get("/oauth/callback/:gateway", PaymentController.oauthCallback);

export default router;
