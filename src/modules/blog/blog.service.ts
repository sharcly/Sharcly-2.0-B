import { prisma } from "../../common/lib/prisma";
import { BlogStatus } from "@prisma/client";

export class BlogService {
  static async getBlogs(query: any) {
    const { status, search, category, tags, page = "1", limit = "10" } = query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
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
      prisma.blog.findMany({
        where,
        skip,
        take: limitNum,
        include: { author: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.blog.count({ where }),
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

  static async getBlogBySlug(slug: string) {
    return await prisma.blog.findUnique({
      where: { slug },
      include: { author: { select: { name: true } } },
    });
  }

  static async createBlog(blogData: any, authorId: string) {
    const { title, slug, content, excerpt, featuredImage, status, publishedAt, metaTitle, metaDescription, category, tags } = blogData;
    
    return await prisma.blog.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        featuredImage,
        category,
        tags,
        status: status || BlogStatus.DRAFT,
        publishedAt: publishedAt ? new Date(publishedAt) : (status === BlogStatus.PUBLISHED ? new Date() : null),
        authorId,
        metaTitle,
        metaDescription
      }
    });
  }

  static async updateBlog(id: string, blogData: any) {
    const { publishedAt, ...rest } = blogData;
    
    return await prisma.blog.update({
      where: { id },
      data: {
        ...rest,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined
      }
    });
  }

  static async deleteBlog(id: string) {
    return await prisma.blog.delete({
      where: { id }
    });
  }
}
