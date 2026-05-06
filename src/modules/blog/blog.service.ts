import { prisma } from "../../common/lib/prisma";
import { BlogStatus } from "@prisma/client";
import { optimizeImage } from "../image/image.service";

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

  static async createBlog(blogData: any, authorId: string, file?: Express.Multer.File) {
    const { title, slug, content, excerpt, status, publishedAt, metaTitle, metaDescription, category, tags, featuredImage } = blogData;
    
    // Ensure unique slug
    const finalSlug = await this.ensureUniqueSlug(slug || this.generateSlug(title));

    let featuredImageData: Buffer | undefined;
    let featuredImageMimeType: string | undefined;

    if (file) {
      featuredImageData = await optimizeImage(file.buffer);
      featuredImageMimeType = "image/webp";
    }

    return await prisma.blog.create({
      data: {
        title,
        slug: finalSlug,
        content,
        excerpt,
        featuredImageData: featuredImageData as any,
        featuredImageMimeType,
        category,
        tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
        status: status || BlogStatus.DRAFT,
        publishedAt: publishedAt ? new Date(publishedAt) : (status === BlogStatus.PUBLISHED ? new Date() : null),
        authorId,
        metaTitle,
        metaDescription
      }
    });
  }

  private static generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-")
      .slice(0, 80);
  }

  private static async ensureUniqueSlug(slug: string): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;
    
    while (true) {
      const existing = await prisma.blog.findUnique({
        where: { slug: uniqueSlug }
      });
      
      if (!existing) break;
      
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
    
    return uniqueSlug;
  }

  static async updateBlog(id: string, blogData: any, file?: Express.Multer.File) {
    const { publishedAt, slug, featuredImage, ...rest } = blogData;
    
    let finalSlug = slug;
    if (slug) {
      // Only check for uniqueness if the slug is changing
      const currentBlog = await prisma.blog.findUnique({ where: { id } });
      if (currentBlog && currentBlog.slug !== slug) {
        finalSlug = await this.ensureUniqueSlug(slug);
      }
    }

    let featuredImageData: Buffer | undefined;
    let featuredImageMimeType: string | undefined;

    if (file) {
      featuredImageData = await optimizeImage(file.buffer);
      featuredImageMimeType = "image/webp";
    }

    return await prisma.blog.update({
      where: { id },
      data: {
        ...rest,
        featuredImageData: featuredImageData as any,
        featuredImageMimeType,
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
