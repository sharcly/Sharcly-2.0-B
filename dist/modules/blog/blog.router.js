"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blog_controller_1 = require("./blog.controller");
const auth_middleware_1 = require("../../common/middlewares/auth.middleware");
const validate_middleware_1 = require("../../common/middlewares/validate.middleware");
const multer_1 = require("../../common/utils/multer");
const router = (0, express_1.Router)();
// Public routes
router.get("/", blog_controller_1.BlogController.getBlogs);
router.get("/:slug", blog_controller_1.BlogController.getBlogBySlug);
// Protected Admin routes — requires blog.manage permission
router.post("/", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("blog.manage"), multer_1.upload.single("featuredImage"), (0, validate_middleware_1.validate)(validate_middleware_1.CreateBlogSchema), blog_controller_1.BlogController.createBlog);
router.patch("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("blog.manage"), multer_1.upload.single("featuredImage"), (0, validate_middleware_1.validate)(validate_middleware_1.UpdateBlogSchema), blog_controller_1.BlogController.updateBlog);
router.delete("/:id", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)("blog.manage"), blog_controller_1.BlogController.deleteBlog);
exports.default = router;
