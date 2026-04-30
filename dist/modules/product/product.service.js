"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const prisma_1 = require("../../common/lib/prisma");
const image_service_1 = require("../image/image.service");
class ProductService {
    static async getProducts(query) {
        const { category, search, sort, page = "1", limit = "10" } = query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (category)
            where.category = { slug: category };
        if (search)
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } }
            ];
        const [products, total] = await Promise.all([
            prisma_1.prisma.product.findMany({
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
            prisma_1.prisma.product.count({ where })
        ]);
        return {
            products,
            total,
            pageNum,
            limitNum
        };
    }
    static async getProductBySlug(slug) {
        const product = await prisma_1.prisma.product.findUnique({
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
        if (!product)
            return null;
        const relatedProducts = await prisma_1.prisma.product.findMany({
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
    static async createProduct(productData, files) {
        const { name, slug, sku, description, price, stock, categoryId, typeId, tags } = productData;
        let tagsArray = [];
        if (tags) {
            tagsArray = typeof tags === "string" ? JSON.parse(tags) : tags;
        }
        const processedImages = await Promise.all(files.map(async (file) => {
            const optimizedBuffer = await (0, image_service_1.optimizeImage)(file.buffer);
            return {
                data: Buffer.from(optimizedBuffer),
                mimeType: "image/webp"
            };
        }));
        return await prisma_1.prisma.product.create({
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
                    connect: tagsArray.map((tagId) => ({ id: tagId }))
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
    static async updateProduct(id, updateData) {
        return await prisma_1.prisma.product.update({
            where: { id },
            data: updateData
        });
    }
    static async deleteProduct(id) {
        return await prisma_1.prisma.product.delete({ where: { id } });
    }
    static async getCategories() {
        return await prisma_1.prisma.category.findMany({
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
    static async createCategory(categoryData) {
        const { name, slug, description } = categoryData;
        return await prisma_1.prisma.category.create({
            data: { name, slug, description }
        });
    }
    static async updateCategory(id, categoryData) {
        const { name, slug, description } = categoryData;
        return await prisma_1.prisma.category.update({
            where: { id },
            data: { name, slug, description }
        });
    }
    static async deleteCategory(id) {
        return await prisma_1.prisma.category.delete({ where: { id } });
    }
    static async getCollections() {
        return await prisma_1.prisma.collection.findMany({
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
    static async getCollectionBySlug(slug) {
        return await prisma_1.prisma.collection.findUnique({
            where: { slug },
            include: { products: { include: { images: { select: { id: true } } } } }
        });
    }
    static async createCollection(collectionData) {
        const { name, slug, description, productIds } = collectionData;
        return await prisma_1.prisma.collection.create({
            data: {
                name,
                slug,
                description,
                products: productIds ? { connect: productIds.map((id) => ({ id })) } : undefined
            }
        });
    }
    static async updateCollection(id, collectionData) {
        const { name, slug, description, productIds } = collectionData;
        return await prisma_1.prisma.collection.update({
            where: { id },
            data: {
                name,
                slug,
                description,
                products: productIds ? { set: productIds.map((id) => ({ id })) } : undefined
            }
        });
    }
    static async deleteCollection(id) {
        return await prisma_1.prisma.collection.delete({ where: { id } });
    }
    static async getTags() {
        return await prisma_1.prisma.productTag.findMany({ orderBy: { name: "asc" } });
    }
    static async createTag(tagData) {
        const { name } = tagData;
        return await prisma_1.prisma.productTag.create({ data: { name } });
    }
    static async getTypes() {
        return await prisma_1.prisma.productType.findMany({ orderBy: { name: "asc" } });
    }
    static async createType(typeData) {
        const { name } = typeData;
        return await prisma_1.prisma.productType.create({ data: { name } });
    }
}
exports.ProductService = ProductService;
