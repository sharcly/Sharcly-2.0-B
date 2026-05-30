"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createType = exports.getTypes = exports.createTag = exports.getTags = exports.deleteCollection = exports.updateCollection = exports.createCollection = exports.getCollectionBySlug = exports.getCollections = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductBySlug = exports.getProducts = void 0;
const prisma_1 = require("../../common/lib/prisma");
const product_service_1 = require("./product.service");
const getProducts = async (req, res) => {
    try {
        const { category, search, sort, page = "1", limit = "10" } = req.query;
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
                    images: {
                        orderBy: { order: "asc" },
                        select: { id: true, isThumbnail: true, order: true, mimeType: true }
                    }
                },
                orderBy: sort === "price-asc" ? { price: "asc" } : sort === "price-desc" ? { price: "desc" } : { createdAt: "desc" }
            }),
            prisma_1.prisma.product.count({ where })
        ]);
        res.status(200).json({
            products: products.map(p => ({
                ...p,
                price: Number(p.price),
                variants: p.variants.map(v => ({ ...v, price: Number(v.price) })),
                // Map images to internal API URLs
                imageUrls: p.images.map(img => `/api/images/${img.id}`)
            })),
            pagination: {
                total,
                page: pageNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error("Fetch products error:", error);
        res.status(500).json({ message: "Failed to fetch products", error });
    }
};
exports.getProducts = getProducts;
const getProductBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const product = await prisma_1.prisma.product.findUnique({
            where: { slug: slug },
            include: {
                category: true,
                variants: true,
                images: {
                    orderBy: { order: "asc" },
                    select: { id: true, isThumbnail: true, order: true, mimeType: true }
                },
                reviews: { include: { user: { select: { name: true } } } }
            }
        });
        if (!product)
            return res.status(404).json({ message: "Product not found" });
        res.status(200).json({
            success: true,
            product: {
                ...product,
                price: Number(product.price),
                variants: product.variants.map(v => ({ ...v, price: Number(v.price) })),
                imageUrls: product.images.map(img => `/api/images/${img.id}`)
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch product" });
    }
};
exports.getProductBySlug = getProductBySlug;
const createProduct = async (req, res) => {
    try {
        const { name, subtitle, slug, sku, description, price, stock, categoryId, typeId, tags, collections, status, discountable, weight, length, height, width, originCountry, material, hsCode, midCode, metaTitle, metaDescription, keywords, canonicalUrl, ogImage, changefreq, options, metadata, variants } = req.body;
        if (!categoryId) {
            return res.status(400).json({ message: "Category is required" });
        }
        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        let tagsArray = [];
        if (tags) {
            tagsArray = Array.isArray(tags) ? tags : (typeof tags === "string" ? JSON.parse(tags) : []);
        }
        const files = req.files || [];
        let processedImages = [];
        const variantImagesMap = new Map();
        // 1. Process Multipart Files (Binary)
        if (files && files.length > 0) {
            const mainImgFiles = files.filter(f => f.fieldname === "product_images" ||
                f.fieldname === "images" ||
                f.fieldname === "thumbnail");
            processedImages = mainImgFiles.map((file, index) => ({
                data: file.buffer,
                mimeType: file.mimetype,
                order: index,
                isThumbnail: index === 0
            }));
            // Process ogImage file if present
            const ogImgFile = files.find(f => f.fieldname === "ogImage" || f.fieldname === "og_image");
            if (ogImgFile) {
                const ogImageRecord = await prisma_1.prisma.productImage.create({
                    data: {
                        productId: "TEMP_ID", // Will be updated if nested creation fails, but here we handle it differently
                        data: ogImgFile.buffer,
                        mimeType: ogImgFile.mimetype,
                        order: 99,
                    }
                });
                // We'll update the productId later if necessary, or just use the ID
                // Actually, it's easier to just push it to processedImages and mark it? No, ogImage in Product is a string.
            }
            const variantImgFiles = files.filter(f => f.fieldname.startsWith("variant_image_"));
            variantImgFiles.forEach(file => {
                const index = parseInt(file.fieldname.split("_").pop() || "0");
                variantImagesMap.set(index, { data: file.buffer, mimeType: file.mimetype });
            });
        }
        // 2. Fallback: Process Base64 images from body (for non-multipart requests)
        if (processedImages.length === 0 && (req.body.product_images || req.body.images)) {
            const bodyImages = req.body.product_images || req.body.images;
            const imagesToProcess = Array.isArray(bodyImages) ? bodyImages : [bodyImages];
            imagesToProcess.forEach((img, index) => {
                if (typeof img === "string" && img.startsWith("data:image/")) {
                    const parts = img.split(";base64,");
                    const mimeType = parts[0].split(":")[1];
                    const data = Buffer.from(parts[1], "base64");
                    processedImages.push({
                        data,
                        mimeType,
                        order: index,
                        isThumbnail: index === 0
                    });
                }
            });
        }
        const variantData = variants ? (typeof variants === "string" ? JSON.parse(variants) : variants) : [];
        const optionsData = options ? (typeof options === "string" ? JSON.parse(options) : options) : null;
        const metadataData = metadata ? (typeof metadata === "string" ? JSON.parse(metadata) : metadata) : null;
        const keywordsData = keywords ? (Array.isArray(keywords) ? keywords : (typeof keywords === "string" && (keywords.startsWith("[") || keywords.startsWith("{")) ? JSON.parse(keywords) : keywords)) : "";
        const product = await prisma_1.prisma.product.create({
            data: {
                name,
                subtitle,
                slug: finalSlug,
                sku,
                description,
                status: status || "DRAFT",
                price: parseFloat(price || "0"),
                stock: parseInt(stock || "0"),
                categoryId: categoryId,
                typeId: (typeId && typeId !== "") ? typeId : null,
                weight: (weight && weight !== "null" && weight !== "") ? parseFloat(weight) : null,
                length: (length && length !== "null" && length !== "") ? parseFloat(length) : null,
                height: (height && height !== "null" && height !== "") ? parseFloat(height) : null,
                width: (width && width !== "null" && width !== "") ? parseFloat(width) : null,
                originCountry,
                material,
                hsCode,
                midCode,
                metaTitle,
                metaDescription,
                keywords: Array.isArray(keywordsData) ? keywordsData.join(", ") : keywordsData,
                canonicalUrl,
                ogImage: ogImage, // Start with body value
                changefreq: changefreq || "monthly",
                options: optionsData,
                metadata: metadataData,
                discountable: discountable === "true" || discountable === true,
                collections: collections && Array.isArray(collections) ? {
                    connect: collections.map((id) => ({ id }))
                } : undefined,
                tags: tagsArray.length > 0 ? {
                    connect: tagsArray
                        .filter((t) => typeof t === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(t))
                        .map((id) => ({ id }))
                } : undefined,
                images: {
                    create: processedImages
                },
                variants: {
                    create: variantData.map((v, idx) => ({
                        title: v.title,
                        sku: v.sku,
                        price: parseFloat(v.price || v.prices?.[0]?.amount || v.price || 0),
                        inventoryQuantity: parseInt(v.inventoryQuantity || v.stock || 0),
                        manageInventory: v.manageInventory === "true" || v.manageInventory === true || v.manageInventory === undefined,
                        allowBackorder: v.allowBackorder === "true" || v.allowBackorder === true,
                        // image: variantImagesMap.get(idx) ? "BINARY_LATER" : (typeof v.image === 'string' ? v.image : null),
                        options: v.options
                    }))
                }
            },
            include: {
                images: { select: { id: true, isThumbnail: true, order: true } },
                variants: true,
                type: true,
                tags: true
            }
        });
        // Handle OG Image file specifically if it was a file
        const ogImgFile = files.find(f => f.fieldname === "ogImage" || f.fieldname === "og_image");
        if (ogImgFile) {
            const ogImgRecord = await prisma_1.prisma.productImage.create({
                data: {
                    productId: product.id,
                    data: ogImgFile.buffer,
                    mimeType: ogImgFile.mimetype,
                    order: 999, // Social image at the end
                }
            });
            await prisma_1.prisma.product.update({
                where: { id: product.id },
                data: { ogImage: ogImgRecord.id }
            });
        }
        console.log(`[ProductInfo] Created product ${product.id} with ${processedImages.length} images.`);
        res.status(201).json({
            success: true,
            product: {
                ...product,
                price: Number(product.price),
                variants: product.variants.map((v) => ({ ...v, price: Number(v.price) })),
                imageUrls: product.images.map((img) => `/api/images/${img.id}`)
            }
        });
    }
    catch (error) {
        console.error("Create product error details:", error);
        const isProduction = process.env.NODE_ENV === "production";
        res.status(500).json({
            message: "Failed to create product",
            ...(isProduction ? {} : { error: error.message, details: error.meta || error.code })
        });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subtitle, slug, sku, description, price, stock, categoryId, typeId, tags, collections, status, discountable, weight, length, height, width, originCountry, material, hsCode, midCode, metaTitle, metaDescription, keywords, canonicalUrl, ogImage, changefreq, options, metadata, variants } = req.body;
        const tagsArray = tags ? (Array.isArray(tags) ? tags : (typeof tags === "string" ? JSON.parse(tags) : [])) : undefined;
        const variantData = variants ? (typeof variants === "string" ? JSON.parse(variants) : variants) : undefined;
        const optionsData = options ? (typeof options === "string" ? JSON.parse(options) : options) : undefined;
        const metadataData = metadata ? (typeof metadata === "string" ? JSON.parse(metadata) : metadata) : undefined;
        const files = req.files || [];
        let processedImages = [];
        // 1. Process Multipart Files
        if (files && files.length > 0) {
            const mainImgFiles = files.filter(f => f.fieldname === "product_images" ||
                f.fieldname === "images" ||
                f.fieldname === "thumbnail");
            processedImages = mainImgFiles.map((file, index) => ({
                data: file.buffer,
                mimeType: file.mimetype,
                order: index,
                isThumbnail: index === 0
            }));
        }
        // 2. Fallback: Base64 from body
        if (processedImages.length === 0 && (req.body.product_images || req.body.images)) {
            const bodyImages = req.body.product_images || req.body.images;
            const imagesToProcess = Array.isArray(bodyImages) ? bodyImages : [bodyImages];
            imagesToProcess.forEach((img, index) => {
                if (typeof img === "string" && img.startsWith("data:image/")) {
                    const parts = img.split(";base64,");
                    const mimeType = parts[0].split(":")[1];
                    const data = Buffer.from(parts[1], "base64");
                    processedImages.push({
                        data,
                        mimeType,
                        order: index,
                        isThumbnail: index === 0
                    });
                }
            });
        }
        const product = await prisma_1.prisma.product.update({
            where: { id: id },
            data: {
                name,
                subtitle,
                slug,
                sku,
                description,
                status,
                price: price !== undefined ? parseFloat(price) : undefined,
                stock: stock !== undefined ? parseInt(stock) : undefined,
                categoryId: categoryId ? categoryId : undefined,
                typeId: (typeId && typeId !== "") ? typeId : (typeId === null ? null : undefined),
                weight: weight !== undefined && weight !== "" ? parseFloat(weight) : undefined,
                length: length !== undefined && length !== "" ? parseFloat(length) : undefined,
                height: height !== undefined && height !== "" ? parseFloat(height) : undefined,
                width: width !== undefined && width !== "" ? parseFloat(width) : undefined,
                originCountry,
                material,
                hsCode,
                midCode,
                metaTitle,
                metaDescription,
                keywords: Array.isArray(keywords) ? keywords.join(", ") : keywords,
                canonicalUrl,
                ogImage: typeof ogImage === 'string' ? ogImage : undefined,
                changefreq,
                options: optionsData,
                metadata: metadataData,
                discountable: discountable === "true" || discountable === true,
                collections: collections && Array.isArray(collections) ? {
                    set: collections.map((id) => ({ id }))
                } : undefined,
                tags: tagsArray ? {
                    set: tagsArray
                        .filter((t) => typeof t === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(t))
                        .map((id) => ({ id }))
                } : undefined,
                images: processedImages.length > 0 ? {
                    deleteMany: {}, // Optional: clear old images if new ones are uploaded
                    create: processedImages
                } : undefined,
                variants: variantData ? {
                    deleteMany: {},
                    create: variantData.map((v) => ({
                        title: v.title,
                        sku: v.sku,
                        price: parseFloat(v.price || 0),
                        inventoryQuantity: parseInt(v.inventoryQuantity || v.stock || 0),
                        manageInventory: v.manageInventory === "true" || v.manageInventory === true || v.manageInventory === undefined,
                        allowBackorder: v.allowBackorder === "true" || v.allowBackorder === true,
                        options: v.options
                    }))
                } : undefined
            },
            include: {
                images: { select: { id: true, isThumbnail: true, order: true } },
                variants: true,
                tags: true,
                category: true
            }
        });
        // Handle OG Image file update specifically
        const ogImgFile = files.find(f => f.fieldname === "ogImage" || f.fieldname === "og_image");
        if (ogImgFile) {
            const ogImgRecord = await prisma_1.prisma.productImage.create({
                data: {
                    productId: product.id,
                    data: ogImgFile.buffer,
                    mimeType: ogImgFile.mimetype,
                    order: 999,
                }
            });
            await prisma_1.prisma.product.update({
                where: { id: product.id },
                data: { ogImage: ogImgRecord.id }
            });
        }
        res.status(200).json({
            success: true,
            product: {
                ...product,
                price: Number(product.price),
                variants: product.variants.map((v) => ({ ...v, price: Number(v.price) })),
                imageUrls: product.images.map((img) => `/api/images/${img.id}`)
            }
        });
    }
    catch (error) {
        console.error("Product update error:", error);
        res.status(500).json({ message: "Failed to update product" });
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await product_service_1.ProductService.deleteProduct(id);
        res.status(200).json({ success: true, message: "Product deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete product" });
    }
};
exports.deleteProduct = deleteProduct;
const getCategories = async (req, res) => {
    try {
        const categories = await prisma_1.prisma.category.findMany({
            where: { parentId: null },
            orderBy: { name: "asc" },
            include: {
                _count: { select: { products: true } },
                children: {
                    include: {
                        _count: { select: { products: true } },
                        children: true
                    }
                }
            }
        });
        res.status(200).json({ success: true, categories });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch categories" });
    }
};
exports.getCategories = getCategories;
const createCategory = async (req, res) => {
    try {
        const { name, slug, description, parentId } = req.body;
        const category = await prisma_1.prisma.category.create({
            data: { name, slug, description, parentId }
        });
        res.status(201).json({ success: true, category });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create category" });
    }
};
exports.createCategory = createCategory;
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, parentId } = req.body;
        const category = await prisma_1.prisma.category.update({
            where: { id: id },
            data: { name, slug, description, parentId }
        });
        res.status(200).json({ success: true, category });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update category" });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await product_service_1.ProductService.deleteCategory(id);
        res.status(200).json({ success: true, message: "Category deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete category" });
    }
};
exports.deleteCategory = deleteCategory;
const getCollections = async (req, res) => {
    try {
        const collections = await product_service_1.ProductService.getCollections();
        res.status(200).json({ success: true, collections });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch collections" });
    }
};
exports.getCollections = getCollections;
const getCollectionBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const collection = await product_service_1.ProductService.getCollectionBySlug(slug);
        if (!collection)
            return res.status(404).json({ message: "Collection not found" });
        res.status(200).json({ success: true, collection });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch collection" });
    }
};
exports.getCollectionBySlug = getCollectionBySlug;
const createCollection = async (req, res) => {
    try {
        const collection = await product_service_1.ProductService.createCollection(req.body);
        res.status(201).json({ success: true, collection });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create collection" });
    }
};
exports.createCollection = createCollection;
const updateCollection = async (req, res) => {
    try {
        const { id } = req.params;
        const collection = await product_service_1.ProductService.updateCollection(id, req.body);
        res.status(200).json({ success: true, collection });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update collection" });
    }
};
exports.updateCollection = updateCollection;
const deleteCollection = async (req, res) => {
    try {
        const { id } = req.params;
        await product_service_1.ProductService.deleteCollection(id);
        res.status(200).json({ success: true, message: "Collection deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to delete collection" });
    }
};
exports.deleteCollection = deleteCollection;
const getTags = async (req, res) => {
    try {
        const tags = await product_service_1.ProductService.getTags();
        res.status(200).json({ success: true, tags });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch tags" });
    }
};
exports.getTags = getTags;
const createTag = async (req, res) => {
    try {
        const tag = await product_service_1.ProductService.createTag(req.body);
        res.status(201).json({ success: true, tag });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create tag" });
    }
};
exports.createTag = createTag;
const getTypes = async (req, res) => {
    try {
        const types = await product_service_1.ProductService.getTypes();
        res.status(200).json({ success: true, types });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch types" });
    }
};
exports.getTypes = getTypes;
const createType = async (req, res) => {
    try {
        const type = await product_service_1.ProductService.createType(req.body);
        res.status(201).json({ success: true, type });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create type" });
    }
};
exports.createType = createType;
