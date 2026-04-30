import { Request, Response } from "express";
import { prisma } from "../../common/lib/prisma";

const MAX_QUERY_LENGTH = 200;

export const universalSearch = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    // Enforce query length limit to prevent DoS / regex overload
    const query = q.slice(0, MAX_QUERY_LENGTH).toLowerCase().trim();

    if (query.length < 2) {
      return res.status(400).json({ success: false, message: "Search query must be at least 2 characters" });
    }

    // Search Products
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { keywords: { contains: query, mode: "insensitive" } },
        ],
        status: "PUBLISHED",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: {
          take: 1,
          select: {
            url: true,
            data: true,
          },
        },
      },
      take: 5,
    });

    // Search Blogs
    const blogs = await prisma.blog.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
          { keywords: { contains: query, mode: "insensitive" } },
        ],
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        featuredImage: true,
        excerpt: true,
        createdAt: true,
      },
      take: 5,
    });

    res.status(200).json({
      success: true,
      results: {
        products,
        blogs,
      },
    });
  } catch (error: any) {
    // Don't leak internal error messages in production
    console.error("Search error:", error);
    const isProduction = process.env.NODE_ENV === "production";
    res.status(500).json({
      success: false,
      message: isProduction ? "Search failed" : error.message,
    });
  }
};
