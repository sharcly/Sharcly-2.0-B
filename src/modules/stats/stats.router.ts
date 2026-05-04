import { Router } from "express";
import { getDashboardStats, getSalesAnalytics } from "./stats.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

// Restricted to ADMIN and MANAGER (and SUPER_ADMIN via middleware check)
router.get("/", authenticate, authorize("dashboard.view"), getDashboardStats);
router.get("/analytics", authenticate, authorize("sales.view"), getSalesAnalytics);

export default router;
