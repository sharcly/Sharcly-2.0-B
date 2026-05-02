import { Router } from "express";
import { BlogController } from "./blog.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";
import { validate, CreateBlogSchema, UpdateBlogSchema } from "../../common/middlewares/validate.middleware";
import { upload } from "../../common/utils/multer";

const router = Router();

// Public routes
router.get("/", BlogController.getBlogs);
router.get("/:slug", BlogController.getBlogBySlug);

// Protected Admin routes — requires blog.manage permission
router.post("/", authenticate, authorize("blog.manage"), upload.single("featuredImage"), validate(CreateBlogSchema), BlogController.createBlog);
router.patch("/:id", authenticate, authorize("blog.manage"), upload.single("featuredImage"), validate(UpdateBlogSchema), BlogController.updateBlog);
router.delete("/:id", authenticate, authorize("blog.manage"), BlogController.deleteBlog);

export default router;
