import { Router } from "express";
import { FaqController } from "./faq.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

// Public route
router.get("/", FaqController.getFaqs);

// Admin routes
router.post("/", authenticate, authorize("cms.manage"), FaqController.createFaq);
router.put("/:id", authenticate, authorize("cms.manage"), FaqController.updateFaq);
router.delete("/:id", authenticate, authorize("cms.manage"), FaqController.deleteFaq);

export default router;
