import { Request, Response } from "express";
import { BlogService } from "./blog.service";

export class BlogController {
  static async getBlogs(req: Request, res: Response) {
    try {
      const data = await BlogService.getBlogs(req.query);
      res.json({ success: true, ...data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getBlogBySlug(req: Request, res: Response) {
    try {
      const blog = await BlogService.getBlogBySlug(req.params.slug as string);
      if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
      res.json({ success: true, blog });
    } catch (error: any) {
      console.error("Error in getBlogBySlug:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createBlog(req: Request, res: Response) {
    try {
      // @ts-ignore
      const authorId = req.user.id;
      const blog = await BlogService.createBlog(req.body, authorId);
      res.status(201).json({ success: true, blog });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateBlog(req: Request, res: Response) {
    try {
      const blog = await BlogService.updateBlog(req.params.id as string, req.body);
      res.json({ success: true, blog });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteBlog(req: Request, res: Response) {
    try {
      await BlogService.deleteBlog(req.params.id as string);
      res.json({ success: true, message: "Blog deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
