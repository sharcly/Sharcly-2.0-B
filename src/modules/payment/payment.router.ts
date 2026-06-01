import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import * as PaymentController from "./payment.controller";
import { handleWebhook } from "./webhook.controller";

const router = Router();

// Public endpoints
router.get("/active-key", PaymentController.getActiveKey);
router.post("/webhook/:gateway", handleWebhook); // Public callback receiver

// Admin authenticated endpoints
router.get("/integrations", authenticate as any, PaymentController.getIntegrations);
router.post("/connect", authenticate as any, PaymentController.connectCredentials);
router.post("/disconnect", authenticate as any, PaymentController.disconnectGateway);
router.post("/test-connection", authenticate as any, PaymentController.testConnection);
router.post("/sync", authenticate as any, PaymentController.syncTransactions);
router.get("/audit-logs", authenticate as any, PaymentController.getAuditLogs);

// OAuth simulator flows
router.get("/oauth/connect/:gateway", authenticate as any, PaymentController.oauthConnect);
router.get("/oauth/consent/:gateway", PaymentController.oauthConsentPage);
router.get("/oauth/callback/:gateway", PaymentController.oauthCallback);

export default router;
