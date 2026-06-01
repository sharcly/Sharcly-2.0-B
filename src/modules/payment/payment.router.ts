import { Router } from "express";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import {
  listGateways,
  addGateway,
  deleteGateway,
  toggleGateway,
  testGateway,
  testCredentials,
  getActiveKey,
  getAuditLogs,
} from "./payment.controller";
import { handleWebhook } from "./webhook.controller";

const router = Router();

// Public — used by checkout to get active provider public key
router.get("/active-key", getActiveKey);

// Public — webhook receivers per provider
router.post("/webhook/:gateway", handleWebhook);

// Admin-only — gateway management
router.get("/gateways",         authenticate as any, listGateways);
router.post("/gateways",        authenticate as any, addGateway);
router.delete("/gateways/:id",  authenticate as any, deleteGateway);
router.patch("/gateways/:id/toggle",  authenticate as any, toggleGateway);
router.post("/gateways/:id/test",     authenticate as any, testGateway);
router.post("/gateways/test-credentials", authenticate as any, testCredentials);
router.get("/audit-logs",       authenticate as any, getAuditLogs);

export default router;
