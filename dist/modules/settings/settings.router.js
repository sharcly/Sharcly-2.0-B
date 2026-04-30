"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("./settings.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Public Settings
router.get("/", settings_controller_1.getStoreSettings);
// Store Settings
router.get("/store", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("settings.manage"), settings_controller_1.getStoreSettings);
router.patch("/store", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("settings.manage"), settings_controller_1.updateStoreSettings);
router.put("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("settings.manage"), settings_controller_1.updateStoreSettings);
// Regions
router.get("/regions", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("settings.manage"), settings_controller_1.getRegions);
router.post("/regions", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("settings.manage"), settings_controller_1.createRegion);
// Reasons
router.get("/return-reasons", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("settings.manage"), settings_controller_1.getReturnReasons);
router.get("/refund-reasons", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("settings.manage"), settings_controller_1.getRefundReasons);
exports.default = router;
