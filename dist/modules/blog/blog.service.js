"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogService = void 0;
const prisma_1 = require("../../common/lib/prisma");
const client_1 = require("@prisma/client");
class BlogService {
    static async getBlogs(query) {
        const { status, search, page = "1", limit = "10" } = query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { content: { contains: search, mode: "insensitive" } },
            ];
        }
        const [blogs, total] = await Promise.all([
            prisma_1.prisma.blog.findMany({
                where,
                skip,
                take: limitNum,
                include: { author: { select: { name: true, email: true } } },
                orderBy: { createdAt: "desc" },
            }),
            prisma_1.prisma.blog.count({ where }),
        ]);
        return {
            blogs,
            pagination: {
                total,
                pages: Math.ceil(total / limitNum),
                page: pageNum,
                limit: limitNum,
            },
        };
    }
    static async getBlogBySlug(slug) {
        return await prisma_1.prisma.blog.findUnique({
            where: { slug },
            include: { author: { select: { name: true } } },
        });
    }
    static async createBlog(blogData, authorId) {
        const { title, slug, content, excerpt, featuredImage, status, publishedAt, metaTitle, metaDescription, category, tags } = blogData;
        return await prisma_1.prisma.blog.create({
            data: {
                title,
                slug,
                content,
                excerpt,
                featuredImage,
                category,
                tags,
                status: status || client_1.BlogStatus.DRAFT,
                publishedAt: publishedAt ? new Date(publishedAt) : (status === client_1.BlogStatus.PUBLISHED ? new Date() : null),
                authorId,
                metaTitle,
                metaDescription
            }
        });
    }
    static async updateBlog(id, blogData) {
        const { publishedAt, ...rest } = blogData;
        return await prisma_1.prisma.blog.update({
            where: { id },
            data: {
                ...rest,
                publishedAt: publishedAt ? new Date(publishedAt) : undefined
            }
        });
    }
    static async deleteBlog(id) {
        return await prisma_1.prisma.blog.delete({
            where: { id }
        });
    }
}
exports.BlogService = BlogService;
