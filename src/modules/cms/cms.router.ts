import { Router } from "express";
import { getPageContent, updateContent, uploadCmsImage } from "./cms.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import { validate, CmsBulkUpdateSchema } from "../../common/middlewares/validate.middleware";
import { upload } from "../../common/utils/multer";

const router = Router();

// Public routes
router.get("/:page", getPageContent);

// Admin routes
router.post("/update", authenticate, authorize("cms.manage"), validate(CmsBulkUpdateSchema), updateContent);
router.post("/upload", authenticate, authorize("cms.manage"), upload.single("image"), uploadCmsImage);

export default router;
