"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const seo_controller_1 = require("./seo.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const validate_middleware_1 = require("../../common/middlewares/validate.middleware");
const router = (0, express_1.Router)();
// Public routes
router.get(/\/page\/(.*)/, seo_controller_1.getSeoBySlug);
router.get("/global/settings", seo_controller_1.getGlobalSeo);
router.get("/sitemap.xml", seo_controller_1.getSitemap);
router.get("/robots.txt", seo_controller_1.getRobots);
// Admin routes
router.get("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), seo_controller_1.getAllSeo);
router.get("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), seo_controller_1.getSeoById);
router.put("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), (0, validate_middleware_1.validate)(validate_middleware_1.SeoUpsertSchema), seo_controller_1.upsertSeo);
router.put("/bulk", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), seo_controller_1.bulkUpsertSeo);
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), seo_controller_1.deleteSeo);
router.put("/global/settings", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("seo.manage"), (0, validate_middleware_1.validate)(validate_middleware_1.GlobalSeoSchema), seo_controller_1.updateGlobalSeo);
exports.default = router;
