import { Router } from "express";
import { getPageContent, updateContent } from "./cms.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import { validate, CmsBulkUpdateSchema } from "../../common/middlewares/validate.middleware";

const router = Router();

// Public routes
router.get("/:page", getPageContent);

// Admin routes
router.post("/update", authenticate, authorize("cms.manage"), validate(CmsBulkUpdateSchema), updateContent);

export default router;
