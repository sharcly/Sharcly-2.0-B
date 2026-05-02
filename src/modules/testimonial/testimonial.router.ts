import { Router } from "express";
import { TestimonialController } from "./testimonial.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import { validate, TestimonialSchema } from "../../common/middlewares/validate.middleware";

const router = Router();

// Public routes
router.get("/", TestimonialController.getAll);

// Admin routes
router.get("/admin", authenticate, authorize("admin", "manager"), TestimonialController.getAll);
router.get("/:id", authenticate, authorize("admin", "manager"), TestimonialController.getById);
router.post("/", authenticate, authorize("admin", "manager"), validate(TestimonialSchema), TestimonialController.create);
router.put("/:id", authenticate, authorize("admin", "manager"), validate(TestimonialSchema), TestimonialController.update);
router.delete("/:id", authenticate, authorize("admin", "manager"), TestimonialController.delete);

export default router;
