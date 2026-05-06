"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const testimonial_controller_1 = require("./testimonial.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const validate_middleware_1 = require("../../common/middlewares/validate.middleware");
const router = (0, express_1.Router)();
// Public routes
router.get("/", testimonial_controller_1.TestimonialController.getAll);
// Admin routes
router.get("/admin", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), testimonial_controller_1.TestimonialController.getAll);
router.get("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), testimonial_controller_1.TestimonialController.getById);
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), (0, validate_middleware_1.validate)(validate_middleware_1.TestimonialSchema), testimonial_controller_1.TestimonialController.create);
router.put("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), (0, validate_middleware_1.validate)(validate_middleware_1.TestimonialSchema), testimonial_controller_1.TestimonialController.update);
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "manager"), testimonial_controller_1.TestimonialController.delete);
exports.default = router;
