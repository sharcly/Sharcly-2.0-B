import { Router } from "express";
import {
  getSeoBySlug,
  getAllSeo,
  getSeoById,
  upsertSeo,
  deleteSeo,
  bulkUpsertSeo,
  getGlobalSeo,
  updateGlobalSeo,
  getSitemap,
  getRobots
} from "./seo.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import { validate, SeoUpsertSchema, GlobalSeoSchema } from "../../common/middlewares/validate.middleware";

const router = Router();

// Public routes
router.get("/page/:slug", getSeoBySlug);
router.get("/global/settings", getGlobalSeo);
router.get("/sitemap.xml", getSitemap);
router.get("/robots.txt", getRobots);

// Admin routes
router.get("/", authenticate, authorize("seo.manage"), getAllSeo);
router.get("/:id", authenticate, authorize("seo.manage"), getSeoById);
router.put("/", authenticate, authorize("seo.manage"), validate(SeoUpsertSchema), upsertSeo);
router.put("/bulk", authenticate, authorize("seo.manage"), bulkUpsertSeo);
router.delete("/:id", authenticate, authorize("seo.manage"), deleteSeo);
router.put("/global/settings", authenticate, authorize("seo.manage"), validate(GlobalSeoSchema), updateGlobalSeo);

export default router;
