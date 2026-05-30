import { Router } from "express";
import { getDashboardStats } from "./stats.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

// Restricted to ADMIN and MANAGER
router.get("/", authenticate, authorize("dashboard.view"), getDashboardStats);

export default router;
