"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogController = void 0;
const blog_service_1 = require("./blog.service");
class BlogController {
    static async getBlogs(req, res) {
        try {
            const data = await blog_service_1.BlogService.getBlogs(req.query);
            res.json({ success: true, ...data });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getBlogBySlug(req, res) {
        try {
            const blog = await blog_service_1.BlogService.getBlogBySlug(req.params.slug);
            if (!blog)
                return res.status(404).json({ success: false, message: "Blog not found" });
            res.json({ success: true, blog });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async createBlog(req, res) {
        try {
            // @ts-ignore
            const authorId = req.user.id;
            const blog = await blog_service_1.BlogService.createBlog(req.body, authorId);
            res.status(201).json({ success: true, blog });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async updateBlog(req, res) {
        try {
            const blog = await blog_service_1.BlogService.updateBlog(req.params.id, req.body);
            res.json({ success: true, blog });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async deleteBlog(req, res) {
        try {
            await blog_service_1.BlogService.deleteBlog(req.params.id);
            res.json({ success: true, message: "Blog deleted successfully" });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.BlogController = BlogController;
