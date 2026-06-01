"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cms_controller_1 = require("./cms.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const multer_1 = require("../../common/utils/multer");
const multer_video_1 = require("../../common/utils/multer-video");
const router = (0, express_1.Router)();
// Public video routes (must be before /:page wildcard)
router.get("/video/hero", cms_controller_1.getHeroVideo);
router.get("/video/stream/:id", cms_controller_1.streamVideo);
// Admin routes
router.patch("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), cms_controller_1.updateContent);
router.post("/update", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), cms_controller_1.updateContent);
router.post("/upload", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), multer_1.upload.single("image"), cms_controller_1.uploadCmsImage);
router.post("/video/upload", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), multer_video_1.uploadVideo.single("video"), cms_controller_1.uploadCmsVideo);
router.delete("/video/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), cms_controller_1.deleteCmsVideo);
// Public page content route (wildcard - must be last)
router.get("/:page", cms_controller_1.getPageContent);
exports.default = router;
