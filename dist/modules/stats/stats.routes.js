"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stats_controller_1 = require("./stats.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Restricted to ADMIN and MANAGER
router.get("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("dashboard.view"), stats_controller_1.getDashboardStats);
exports.default = router;
