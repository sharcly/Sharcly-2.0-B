"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogService = void 0;
const prisma_1 = require("../../common/lib/prisma");
const client_1 = require("@prisma/client");
const image_service_1 = require("../image/image.service");
class BlogService {
    static async getBlogs(query) {
        const { status, search, category, tags, page = "1", limit = "10" } = query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (status)
            where.status = status;
        if (category)
            where.category = category;
        if (tags) {
            const tagList = Array.isArray(tags) ? tags : tags.split(",");
            where.tags = { hasSome: tagList };
        }
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
    static async createBlog(blogData, authorId, file) {
        const { title, slug, content, excerpt, status, publishedAt, metaTitle, metaDescription, category, tags } = blogData;
        let featuredImageData;
        let featuredImageMimeType;
        if (file) {
            featuredImageData = await (0, image_service_1.optimizeImage)(file.buffer);
            featuredImageMimeType = "image/webp";
        }
        return await prisma_1.prisma.blog.create({
            data: {
                title,
                slug,
                content,
                excerpt,
                featuredImageData: featuredImageData,
                featuredImageMimeType,
                category,
                tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
                status: status || client_1.BlogStatus.DRAFT,
                publishedAt: publishedAt ? new Date(publishedAt) : (status === client_1.BlogStatus.PUBLISHED ? new Date() : null),
                authorId,
                metaTitle,
                metaDescription
            }
        });
    }
    static async updateBlog(id, blogData, file) {
        const { publishedAt, ...rest } = blogData;
        let featuredImageData;
        let featuredImageMimeType;
        if (file) {
            featuredImageData = await (0, image_service_1.optimizeImage)(file.buffer);
            featuredImageMimeType = "image/webp";
        }
        return await prisma_1.prisma.blog.update({
            where: { id },
            data: {
                ...rest,
                featuredImageData: featuredImageData,
                featuredImageMimeType,
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
