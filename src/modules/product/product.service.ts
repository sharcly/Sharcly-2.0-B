
import { prisma } from "../../common/lib/prisma";
import { optimizeImage } from "../image/image.service";

export class ProductService {
  static async getProducts(query: any) {
    const { category, search, sort, page = "1", limit = "10" } = query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (category) where.category = { slug: category as string };
    if (search) where.OR = [
      { name: { contains: search as string, mode: "insensitive" } },
      { description: { contains: search as string, mode: "insensitive" } }
    ];

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          category: true,
          type: true,
          tags: true,
          variants: true,
          images: { select: { id: true } }
        },
        orderBy: sort === "price-asc" ? { price: "asc" } : sort === "price-desc" ? { price: "desc" } : { createdAt: "desc" }
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      total,
      pageNum,
      limitNum
    };
  }

  static async getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        type: true,
        tags: true,
        variants: true,
        images: { select: { id: true } },
        reviews: { include: { user: { select: { name: true } } } }
      }
    });

    if (!product) return null;

    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id }
      },
      take: 4,
      include: {
        images: { select: { id: true } },
        category: true
      }
    });

    return { product, relatedProducts };
  }

  static async createProduct(productData: any, files: any[]) {
    const { name, slug, sku, description, price, stock, categoryId, typeId, tags } = productData;
    let tagsArray = [];
    if (tags) {
      tagsArray = typeof tags === "string" ? JSON.parse(tags) : tags;
    }

    const processedImages = await Promise.all(
      files.map(async (file) => {
        const optimizedBuffer = await optimizeImage(file.buffer);
        return {
          data: Buffer.from(optimizedBuffer),
          mimeType: "image/webp"
        };
      })
    );

    return await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        description,
        price,
        stock,
        categoryId,
        typeId,
        tags: tagsArray.length > 0 ? {
          connect: tagsArray.map((tagId: string) => ({ id: tagId }))
        } : undefined,
        images: {
          create: processedImages
        }
      },
      include: {
        images: { select: { id: true } },
        type: true,
        tags: true
      }
    });
  }

  static async updateProduct(id: string, updateData: any) {
    return await prisma.product.update({
      where: { id },
      data: updateData
    });
  }

  static async deleteProduct(id: string) {
    return await prisma.product.delete({ where: { id } });
  }

  static async getCategories() {
    return await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
        products: {
          take: 6,
          select: { id: true, name: true, slug: true, description: true }
        }
      }
    });
  }

  static async createCategory(categoryData: any) {
    const { name, slug, description } = categoryData;
    return await prisma.category.create({
      data: { name, slug, description }
    });
  }

  static async updateCategory(id: string, categoryData: any) {
    const { name, slug, description } = categoryData;
    return await prisma.category.update({
      where: { id },
      data: { name, slug, description }
    });
  }

  static async deleteCategory(id: string) {
    return await prisma.category.delete({ where: { id } });
  }

  static async getCollections() {
    return await prisma.collection.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
        products: {
          take: 6,
          select: { id: true, name: true, slug: true, description: true }
        }
      }
    });
  }

  static async getCollectionBySlug(slug: string) {
    return await prisma.collection.findUnique({
      where: { slug },
      include: { products: { include: { images: { select: { id: true } } } } }
    });
  }

  static async createCollection(collectionData: any) {
    const { name, slug, description, productIds } = collectionData;
    return await prisma.collection.create({
      data: {
        name,
        slug,
        description,
        products: productIds ? { connect: productIds.map((id: string) => ({ id })) } : undefined
      }
    });
  }

  static async updateCollection(id: string, collectionData: any) {
    const { name, slug, description, productIds } = collectionData;
    return await prisma.collection.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        products: productIds ? { set: productIds.map((id: string) => ({ id })) } : undefined
      }
    });
  }

  static async deleteCollection(id: string) {
    return await prisma.collection.delete({ where: { id } });
  }

  static async getTags() {
    return await prisma.productTag.findMany({ orderBy: { name: "asc" } });
  }

  static async createTag(tagData: any) {
    const { name } = tagData;
    return await prisma.productTag.create({ data: { name } });
  }

  static async getTypes() {
    return await prisma.productType.findMany({ orderBy: { name: "asc" } });
  }

  static async createType(typeData: any) {
    const { name } = typeData;
    return await prisma.productType.create({ data: { name } });
  }
}
