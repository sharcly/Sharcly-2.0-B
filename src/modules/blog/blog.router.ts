import { Router } from "express";
import { BlogController } from "./blog.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

// Public routes
router.get("/", BlogController.getBlogs);
router.get("/:slug", BlogController.getBlogBySlug);

// Protected Admin routes — requires blog.manage permission
router.post("/", authenticate, authorize("blog.manage"), BlogController.createBlog);
router.patch("/:id", authenticate, authorize("blog.manage"), BlogController.updateBlog);
router.delete("/:id", authenticate, authorize("blog.manage"), BlogController.deleteBlog);

export default router;
