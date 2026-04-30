import { Router } from "express";
import { WholesaleController } from "./wholesale.controller";

const router = Router();

router.post("/inquiries", WholesaleController.createInquiry);
router.get("/inquiries", WholesaleController.getInquiries);
router.get("/plans", WholesaleController.getPlans);
router.post("/plans", WholesaleController.createPlan);
router.put("/plans/:id", WholesaleController.updatePlan);
router.delete("/plans/:id", WholesaleController.deletePlan);

export default router;
