import { Router } from "express";
import { getPageContent, updateContent, uploadCmsImage, uploadCmsVideo, getHeroVideo, streamVideo, deleteCmsVideo } from "./cms.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import { validate, CmsBulkUpdateSchema } from "../../common/middlewares/validate.middleware";
import { upload } from "../../common/utils/multer";
import { uploadVideo } from "../../common/utils/multer-video";

const router = Router();

// Public video routes (must be before /:page wildcard)
router.get("/video/hero", getHeroVideo);
router.get("/video/stream/:id", streamVideo);

// Admin routes
router.post("/update", authenticate, authorize("cms.manage"), validate(CmsBulkUpdateSchema), updateContent);
router.post("/upload", authenticate, authorize("cms.manage"), upload.single("image"), uploadCmsImage);
router.post("/video/upload", authenticate, authorize("cms.manage"), uploadVideo.single("video"), uploadCmsVideo);
router.delete("/video/:id", authenticate, authorize("cms.manage"), deleteCmsVideo);

// Public page content route (wildcard - must be last)
router.get("/:page", getPageContent);

export default router;
