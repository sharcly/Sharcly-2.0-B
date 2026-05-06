"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contact_controller_1 = require("./contact.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Public route to send message
router.post("/", contact_controller_1.ContactController.createMessage);
// Admin routes
router.get("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "super_admin"), contact_controller_1.ContactController.getAllMessages);
router.patch("/:id/status", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "super_admin"), contact_controller_1.ContactController.updateStatus);
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("admin", "super_admin"), contact_controller_1.ContactController.deleteMessage);
exports.default = router;
