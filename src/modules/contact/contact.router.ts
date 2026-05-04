import { Router } from "express";
import { ContactController } from "./contact.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

// Public route to send message
router.post("/", ContactController.createMessage);

// Admin routes
router.get("/", authenticate, authorize("admin", "super_admin"), ContactController.getAllMessages);
router.patch("/:id/status", authenticate, authorize("admin", "super_admin"), ContactController.updateStatus);
router.delete("/:id", authenticate, authorize("admin", "super_admin"), ContactController.deleteMessage);

export default router;
