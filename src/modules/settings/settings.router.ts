import { Router } from "express";
import { 
  getStoreSettings, 
  updateStoreSettings, 
  getRegions, 
  createRegion,
  deleteRegion,
  getReturnReasons,
  getRefundReasons
} from "./settings.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

// Public Settings
router.get("/", getStoreSettings);

// Store Settings
router.get("/store", authenticate, authorize("settings.manage"), getStoreSettings);
router.patch("/store", authenticate, authorize("settings.manage"), updateStoreSettings);
router.put("/", authenticate, authorize("settings.manage"), updateStoreSettings);

// Regions
router.get("/regions", authenticate, authorize("settings.manage"), getRegions);
router.post("/regions", authenticate, authorize("settings.manage"), createRegion);
router.delete("/regions/:id", authenticate, authorize("settings.manage"), deleteRegion);

// Reasons
router.get("/return-reasons", authenticate, authorize("settings.manage"), getReturnReasons);
router.get("/refund-reasons", authenticate, authorize("settings.manage"), getRefundReasons);

export default router;
