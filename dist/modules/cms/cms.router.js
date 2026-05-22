"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cms_controller_1 = require("./cms.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const validate_middleware_1 = require("../../common/middlewares/validate.middleware");
const multer_1 = require("../../common/utils/multer");
const router = (0, express_1.Router)();
// Public routes
router.get("/:page", cms_controller_1.getPageContent);
// Admin routes
router.post("/update", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), (0, validate_middleware_1.validate)(validate_middleware_1.CmsBulkUpdateSchema), cms_controller_1.updateContent);
router.post("/upload", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("cms.manage"), multer_1.upload.single("image"), cms_controller_1.uploadCmsImage);
exports.default = router;
