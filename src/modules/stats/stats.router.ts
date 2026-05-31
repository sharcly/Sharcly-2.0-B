import { Router } from "express";
import { getDashboardStats, getSalesAnalytics } from "./stats.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

// Restricted to ADMIN and MANAGER
router.get("/", authenticate, authorize("dashboard.view"), getDashboardStats);
router.get("/analytics", authenticate, authorize("dashboard.view"), getSalesAnalytics);

export default router;
