// trigger nodemon restart
import { Request, Response } from "express";
import { prisma } from "../../common/lib/prisma";
import { ProductService } from "./product.service";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category, flavour, search, sort, page = "1", limit = "10", featured } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit as string) || 10), 100); // Cap at 100
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (featured === "true") {
      where.OR = [
        { featured: true },
        { tags: { some: { name: "featured" } } }
      ];
    }
    if (category) where.category = { slug: category as string };
    if (flavour) where.flavours = { some: { slug: flavour as string } };
    if (search) {
      const searchTerms = (search as string).trim().split(/\s+/).filter(Boolean);
      const searchFilter = searchTerms.map(term => ({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } }
        ]
      }));
      
      if (where.OR) {
        // If we already have a featured OR, we need to AND it with the search OR
        where.AND = [
          { OR: where.OR },
          ...searchFilter
        ];
        delete where.OR;
      } else {
        where.AND = searchFilter;
      }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          category: true,
          type: true,
          tags: true,
          flavours: true,
          variants: true,
          images: {
            orderBy: { order: "asc" },
            select: { id: true, isThumbnail: true, order: true, mimeType: true }
          }
        },
        orderBy: sort === "price-asc" ? { price: "asc" } : sort === "price-desc" ? { price: "desc" } : { createdAt: "desc" }
      }),
      prisma.product.count({ where })
    ]);

    res.status(200).json({
      products: products.map((p: any) => ({
        ...p,
        ingredients: p.ingredients,
        testimonials: p.testimonials,
        price: Number(p.price),
        actualPrice: p.actualPrice ? Number(p.actualPrice) : (p.variants?.find((v: any) => v.actualPrice != null)?.actualPrice ? Number(p.variants.find((v: any) => v.actualPrice != null).actualPrice) : null),
        variants: p.variants.map((v: any) => ({ 
          ...v, 
          price: Number(v.price),
          actualPrice: v.actualPrice ? Number(v.actualPrice) : null
        })),
        // Map images to internal API URLs
        imageUrls: p.images.map((img: any) => `/api/images/${img.id}`)
      })),
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Fetch products error:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

export const getProductBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const product = await prisma.product.findUnique({
      where: { slug: slug as string },
      include: {
        category: true,
        variants: true,
        images: {
          orderBy: { order: "asc" },
          select: { id: true, isThumbnail: true, order: true, mimeType: true }
        },
        flavours: true,
        reviews: { include: { user: { select: { name: true } } } }
      }
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    res.status(200).json({
      success: true,
      product: {
        ...product,
        ingredients: product.ingredients,
        testimonials: product.testimonials,
        price: Number(product.price),
        actualPrice: product.actualPrice ? Number(product.actualPrice) : (product.variants?.find((v: any) => v.actualPrice != null)?.actualPrice ? Number(product.variants.find((v: any) => v.actualPrice != null).actualPrice) : null),
        variants: product.variants.map((v: any) => ({ 
          ...v, 
          price: Number(v.price),
          actualPrice: v.actualPrice ? Number(v.actualPrice) : null
        })),
        imageUrls: product.images.map((img: any) => `/api/images/${img.id}`)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 3;
    const excludeIds = req.query.exclude ? (req.query.exclude as string).split(',').filter(Boolean) : [];

    const products = await prisma.product.findMany({
      where: {
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {})
      },
      take: limit,
      include: {
        images: {
          orderBy: { order: "asc" },
          select: { id: true, isThumbnail: true, order: true, mimeType: true }
        }
      },
      // Optionally sort by featured or createdAt to ensure good recommendations
      orderBy: [
        { featured: "desc" },
        { createdAt: "desc" }
      ]
    });

    const formatted = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      image: p.images.length > 0 ? `/api/images/${p.images[0].id}` : ""
    }));

    res.status(200).json({ success: true, recommendations: formatted });
  } catch (error) {
    console.error("Fetch recommendations error:", error);
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
};


export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name, subtitle, slug, sku, description, price, actualPrice, stock, categoryId, typeId, tags, collections, flavours,
      status, discountable, weight, length, height, width, originCountry, material, hsCode, midCode,
      metaTitle, metaDescription, keywords, canonicalUrl, ogImage, changefreq,
      options, metadata, variants, featured, ingredients, testimonials
    } = req.body;

    if (!categoryId) {
      return res.status(400).json({ message: "Category is required" });
    }

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    let tagsArray = [];
    if (tags) {
      try {
        tagsArray = Array.isArray(tags) ? tags : (typeof tags === "string" ? JSON.parse(tags) : []);
      } catch (e) { tagsArray = []; }
    }

    let collectionsArray = [];
    if (collections) {
      try {
        collectionsArray = Array.isArray(collections) ? collections : (typeof collections === "string" ? JSON.parse(collections) : []);
      } catch (e) { collectionsArray = []; }
    }

    let flavoursArray = [];
    if (flavours) {
      try {
        flavoursArray = Array.isArray(flavours) ? flavours : (typeof flavours === "string" ? JSON.parse(flavours) : []);
      } catch (e) { flavoursArray = []; }
    }

    const files = (req.files as any[]) || [];
    let processedImages: any[] = [];
    const variantImagesMap = new Map();

    // 1. Process Multipart Files (Binary)
    if (files && files.length > 0) {
      const mainImgFiles = files.filter(f => 
        f.fieldname === "product_images" || 
        f.fieldname === "images" || 
        f.fieldname === "thumbnail"
      );
      
      processedImages = mainImgFiles.map((file, index) => ({
        data: file.buffer,
        mimeType: file.mimetype,
        order: index,
        isThumbnail: index === 0
      }));

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
      
      imagesToProcess.forEach((img: any, index: number) => {
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
    const testimonialsData = testimonials ? (typeof testimonials === "string" ? JSON.parse(testimonials) : testimonials) : null;

    const product = await prisma.product.create({
      data: {
        name,
        subtitle,
        slug: finalSlug,
        sku: sku || null,
        description,
        status: status || "DRAFT",
        price: (price !== undefined && price !== "" && price !== "null") ? parseFloat(price as string) : 0,
        actualPrice: (actualPrice !== undefined && actualPrice !== "" && actualPrice !== "null") ? parseFloat(actualPrice as string) : null,
        stock: (stock !== undefined && stock !== "" && stock !== "null") ? parseInt(stock as string) : 0,
        categoryId: categoryId as string,
        typeId: (typeId && typeId !== "") ? (typeId as string) : null,
        weight: (weight && weight !== "null" && weight !== "") ? parseFloat(weight as string) : null,
        length: (length && length !== "null" && length !== "") ? parseFloat(length as string) : null,
        height: (height && height !== "null" && height !== "") ? parseFloat(height as string) : null,
        width: (width && width !== "null" && width !== "") ? parseFloat(width as string) : null,
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
        featured: featured === "true" || featured === true,
        ingredients: ingredients || null,
        testimonials: testimonialsData,
        discountable: discountable === "true" || discountable === true,
        collections: collectionsArray.length > 0 ? {
          connect: collectionsArray.map((id: string) => ({ id }))
        } : undefined,
        tags: tagsArray.length > 0 ? {
          connect: tagsArray
            .filter((t: any) => typeof t === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(t))
            .map((id: string) => ({ id }))
        } : undefined,
        flavours: (flavoursArray && Array.isArray(flavoursArray)) ? {
          connect: flavoursArray
            .filter((f: any) => typeof f === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(f))
            .map((id: string) => ({ id }))
        } : undefined,
        images: {
          create: processedImages
        },
        variants: {
          create: variantData.map((v: any, idx: number) => ({
            title: v.title,
            sku: v.sku || null,
            price: parseFloat(v.price || v.prices?.[0]?.amount || v.price || 0),
            actualPrice: v.actualPrice ? parseFloat(v.actualPrice as string) : null,
            inventoryQuantity: parseInt(v.inventoryQuantity || v.stock || 0),
            manageInventory: v.manageInventory === "true" || v.manageInventory === true || v.manageInventory === undefined,
            allowBackorder: v.allowBackorder === "true" || v.allowBackorder === true,
            image: typeof v.image === 'string' ? v.image : null,
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
      const ogImgRecord = await prisma.productImage.create({
        data: {
          productId: product.id,
          data: ogImgFile.buffer,
          mimeType: ogImgFile.mimetype,
          order: 999, // Social image at the end
        }
      });
      await prisma.product.update({
        where: { id: product.id },
        data: { ogImage: ogImgRecord.id }
      });
    }

    // 3. Process and Link Variant Images
    for (const [idx, imgData] of variantImagesMap.entries()) {
      const targetVData = variantData[idx];
      if (!targetVData) continue;

      // Find the created variant that matches the title and price from input
      const variant = product.variants.find(v => 
        v.title === targetVData.title && 
        Math.abs(Number(v.price) - Number(targetVData.price || targetVData.prices?.[0]?.amount || 0)) < 0.01
      );

      if (variant) {
        const newImage = await prisma.productImage.create({
          data: {
            productId: product.id,
            data: imgData.data,
            mimeType: imgData.mimeType,
            order: 10 + idx, 
          }
        });
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { image: newImage.id }
        });
      }
    }



    // Re-fetch product to get updated variant image links
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        images: { select: { id: true, isThumbnail: true, order: true, mimeType: true } },
        variants: { orderBy: { createdAt: 'asc' } },
        type: true,
        tags: true,
        category: true,
        collections: true,
        flavours: true
      }
    });

    if (!updatedProduct) throw new Error("Product re-fetch failed");

    res.status(201).json({ 
      success: true, 
      product: {
        ...updatedProduct,
        ingredients: updatedProduct.ingredients,
        testimonials: updatedProduct.testimonials,
        price: Number(updatedProduct.price),
        actualPrice: updatedProduct.actualPrice ? Number(updatedProduct.actualPrice) : (updatedProduct.variants?.find((v: any) => v.actualPrice != null)?.actualPrice ? Number(updatedProduct.variants.find((v: any) => v.actualPrice != null).actualPrice) : null),
        variants: updatedProduct.variants.map((v: any) => ({ 
          ...v, 
          price: Number(v.price),
          actualPrice: v.actualPrice ? Number(v.actualPrice) : null
        })),
        imageUrls: updatedProduct.images.map((img: any) => `/api/images/${img.id}`)
      }
    });
  } catch (error: any) {
    console.error("Create product error details:", error);
    const isProduction = process.env.NODE_ENV === "production";
    res.status(500).json({
      message: "Failed to create product",
      ...(isProduction ? {} : { error: error.message, details: error.meta || error.code })
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, subtitle, slug, sku, description, price, actualPrice, stock, categoryId, typeId, tags, collections, flavours,
      status, discountable, weight, length, height, width, originCountry, material, hsCode, midCode,
      metaTitle, metaDescription, keywords, canonicalUrl, ogImage, changefreq,
      options, metadata, variants, featured, imageOrder, ingredients, testimonials
    } = req.body;

    let tagsArray = undefined;
    if (tags) {
      try {
        tagsArray = Array.isArray(tags) ? tags : (typeof tags === "string" ? JSON.parse(tags) : []);
      } catch (e) { tagsArray = []; }
    }

    let collectionsArray = undefined;
    if (collections) {
      try {
        collectionsArray = Array.isArray(collections) ? collections : (typeof collections === "string" ? JSON.parse(collections) : []);
      } catch (e) { collectionsArray = []; }
    }

    let flavoursArray = undefined;
    if (flavours) {
      try {
        flavoursArray = Array.isArray(flavours) ? flavours : (typeof flavours === "string" ? JSON.parse(flavours) : []);
      } catch (e) { flavoursArray = []; }
    }

    let variantData = undefined;
    if (variants) {
      try {
        variantData = typeof variants === "string" ? JSON.parse(variants) : variants;
      } catch (e) { variantData = []; }
    }

    let optionsData = undefined;
    if (options) {
      try {
        optionsData = typeof options === "string" ? JSON.parse(options) : options;
      } catch (e) { optionsData = []; }
    }

    let metadataData = undefined;
    if (metadata) {
      try {
        metadataData = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
      } catch (e) { metadataData = []; }
    }

    let testimonialsData = undefined;
    if (testimonials) {
      try {
        testimonialsData = typeof testimonials === "string" ? JSON.parse(testimonials) : testimonials;
      } catch (e) { testimonialsData = []; }
    }

    const hasImageOrder = req.body.imageOrder !== undefined;
    let imageOrderArray = [];
    if (hasImageOrder) {
      try {
        imageOrderArray = typeof imageOrder === "string" ? JSON.parse(imageOrder) : imageOrder;
      } catch (e) { 
        imageOrderArray = []; 
      }
    }

    const variantImagesMap = new Map();

    const files = (req.files as any[]) || [];
    let processedImages: any[] = [];
    
    const thumbnailFile = files.find(f => f.fieldname === "thumbnail");

    // 1. Process Multipart Files
    if (files && files.length > 0) {
      const mainImgFiles = files.filter(f => 
        f.fieldname === "product_images" || 
        f.fieldname === "images" || 
        f.fieldname === "thumbnail"
      );
      
      if (thumbnailFile) {
        processedImages.push({
          data: thumbnailFile.buffer,
          mimeType: thumbnailFile.mimetype,
          order: 0,
          isThumbnail: true
        });
      }
      
      galleryFiles.forEach((file, index) => {
        processedImages.push({
          data: file.buffer,
          mimeType: file.mimetype,
          order: 1 + index,
          isThumbnail: false
        });
      });

      const variantImgFiles = files.filter(f => f.fieldname.startsWith("variant_image_"));
      variantImgFiles.forEach(file => {
        const index = parseInt(file.fieldname.split("_").pop() || "0");
        variantImagesMap.set(index, { data: file.buffer, mimeType: file.mimetype });
      });
    }

    // 2. Fallback: Base64 from body
    if (processedImages.length === 0 && (req.body.product_images || req.body.images)) {
      const bodyImages = req.body.product_images || req.body.images;
      const imagesToProcess = Array.isArray(bodyImages) ? bodyImages : [bodyImages];
      
      imagesToProcess.forEach((img: any, index: number) => {
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

    // 2.5 Handle Image Rearrangement & Cleanup (BEFORE update to avoid deleting new images)
    if (hasImageOrder) {
      const variantImageIds = (variantData || []).map((v: any) => v.image).filter(Boolean);
      
      // Cleanup removed images
      await prisma.productImage.deleteMany({
        where: {
          productId: id as string,
          id: { notIn: [...imageOrderArray, ...variantImageIds] },
          order: { lt: 900 }
        }
      });

      // Set orders for existing images
      for (let i = 0; i < imageOrderArray.length; i++) {
        const imgId = imageOrderArray[i];
        if (typeof imgId === 'string' && imgId.length > 20) { // Likely a UUID
           await prisma.productImage.updateMany({
             where: { id: imgId, productId: id as string },
             data: { 
               order: thumbnailFile ? i + 1 : i,
               isThumbnail: !thumbnailFile && i === 0
             }
           });
        }
      }
    }

    const product = await prisma.product.update({
      where: { id: id as string },
      data: {
        name,
        subtitle,
        slug,
        sku: sku || null,
        description,
        status,
        price: (price !== undefined && price !== "" && price !== "null") ? parseFloat(price as string) : undefined,
        actualPrice: (actualPrice !== undefined && actualPrice !== "" && actualPrice !== "null") ? parseFloat(actualPrice as string) : (actualPrice === null ? null : undefined),
        stock: (stock !== undefined && stock !== "" && stock !== "null") ? parseInt(stock as string) : undefined,
        categoryId: categoryId ? (categoryId as string) : undefined,
        typeId: (typeId && typeId !== "") ? (typeId as string) : (typeId === null ? null : undefined),
        weight: weight !== undefined && weight !== "" ? parseFloat(weight as string) : undefined,
        length: length !== undefined && length !== "" ? parseFloat(length as string) : undefined,
        height: height !== undefined && height !== "" ? parseFloat(height as string) : undefined,
        width: width !== undefined && width !== "" ? parseFloat(width as string) : undefined,
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
        featured: featured !== undefined ? (featured === "true" || featured === true) : undefined,
        ingredients: ingredients !== undefined ? (ingredients || null) : undefined,
        testimonials: testimonialsData !== undefined ? testimonialsData : undefined,
        discountable: discountable === "true" || discountable === true,
        collections: collectionsArray ? {
          set: collectionsArray.map((id: string) => ({ id }))
        } : undefined,
        tags: tagsArray ? {
          set: tagsArray
            .filter((t: any) => typeof t === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(t))
            .map((id: string) => ({ id }))
        } : undefined,
        flavours: (flavoursArray && Array.isArray(flavoursArray) && flavoursArray.length > 0) ? {
          set: flavoursArray
            .filter((f: any) => typeof f === "string" && f.length > 0)
            .map((id: string) => ({ id }))
        } : (flavoursArray && Array.isArray(flavoursArray) && flavoursArray.length === 0) ? {
          set: []
        } : undefined,
        images: processedImages.length > 0 ? {
          create: processedImages
        } : undefined,
        variants: variantData ? {
          deleteMany: {},
          create: variantData.map((v: any) => ({
            title: v.title,
            sku: v.sku || null,
            price: parseFloat(v.price || 0),
            actualPrice: v.actualPrice ? parseFloat(v.actualPrice as string) : null,
            inventoryQuantity: parseInt(v.inventoryQuantity || v.stock || 0),
            manageInventory: v.manageInventory === "true" || v.manageInventory === true || v.manageInventory === undefined,
            allowBackorder: v.allowBackorder === "true" || v.allowBackorder === true,
            image: typeof v.image === 'string' ? v.image : null,
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
      const ogImgRecord = await prisma.productImage.create({
        data: {
          productId: product.id,
          data: ogImgFile.buffer,
          mimeType: ogImgFile.mimetype,
          order: 999,
        }
      });
      await prisma.product.update({
        where: { id: product.id },
        data: { ogImage: ogImgRecord.id }
      });
    }

    // 3. Process and Link New Variant Images
    for (const [idx, imgData] of variantImagesMap.entries()) {
      const targetVData = variantData[idx];
      if (!targetVData) continue;

      // Find the updated variant that matches the title
      const variant = product.variants.find(v => v.title === targetVData.title);

      if (variant) {
        const newImage = await prisma.productImage.create({
          data: {
            productId: product.id,
            data: imgData.data,
            mimeType: imgData.mimeType,
            order: 20 + idx, 
          }
        });
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { image: newImage.id }
        });
      }
    }

    // Re-fetch product to get updated variant image links
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        images: { select: { id: true, isThumbnail: true, order: true, mimeType: true } },
        variants: { orderBy: { createdAt: 'asc' } },
        tags: true,
        category: true,
        collections: true,
        type: true,
        flavours: true
      }
    });

    if (!updatedProduct) throw new Error("Product re-fetch failed");

    res.status(200).json({ 
      success: true, 
      message: "Product updated successfully v2",
      product: {
        ...updatedProduct,
        ingredients: updatedProduct.ingredients,
        testimonials: updatedProduct.testimonials,
        price: Number(updatedProduct.price),
        actualPrice: updatedProduct.actualPrice ? Number(updatedProduct.actualPrice) : (updatedProduct.variants?.find((v: any) => v.actualPrice != null)?.actualPrice ? Number(updatedProduct.variants.find((v: any) => v.actualPrice != null).actualPrice) : null),
        variants: updatedProduct.variants.map((v: any) => ({ 
          ...v, 
          price: Number(v.price),
          actualPrice: v.actualPrice ? Number(v.actualPrice) : null
        })),
        imageUrls: updatedProduct.images.map((img: any) => `/api/images/${img.id}`)
      }
    });
  } catch (error: any) {
    console.error("Product update error:", error);
    const isProduction = process.env.NODE_ENV === "production";
    res.status(500).json({ 
      message: "Failed to update product",
      ...(isProduction ? {} : { error: String(error), details: error?.meta || error?.code })
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ProductService.deleteProduct(id as string);
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error: any) {
    console.error("Delete product error:", error);
    // Check for Prisma foreign key constraint error (P2003)
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        message: "Cannot delete product because it is linked to existing orders. Please archive it instead." 
      });
    }
    res.status(500).json({ message: "Failed to delete product. It might be linked to other records." });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
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
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, parentId } = req.body;
    const category = await prisma.category.create({
      data: { name, slug, description, parentId }
    });
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ message: "Failed to create category" });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, description, parentId } = req.body;
    const category = await prisma.category.update({
      where: { id: id as string },
      data: { name, slug, description, parentId }
    });
    res.status(200).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ message: "Failed to update category" });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ProductService.deleteCategory(id as string);
    res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category" });
  }
};

export const getCollections = async (req: Request, res: Response) => {
  try {
    const collections = await ProductService.getCollections();
    res.status(200).json({ success: true, collections });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch collections" });
  }
};

export const getCollectionBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const collection = await ProductService.getCollectionBySlug(slug as string);
    if (!collection) return res.status(404).json({ message: "Collection not found" });
    res.status(200).json({ success: true, collection });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch collection" });
  }
};

export const createCollection = async (req: Request, res: Response) => {
  try {
    const collection = await ProductService.createCollection(req.body);
    res.status(201).json({ success: true, collection });
  } catch (error) {
    res.status(500).json({ message: "Failed to create collection" });
  }
};

export const updateCollection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collection = await ProductService.updateCollection(id as string, req.body);
    res.status(200).json({ success: true, collection });
  } catch (error) {
    res.status(500).json({ message: "Failed to update collection" });
  }
};

export const deleteCollection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ProductService.deleteCollection(id as string);
    res.status(200).json({ success: true, message: "Collection deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete collection" });
  }
};

export const getTags = async (req: Request, res: Response) => {
  try {
    const tags = await ProductService.getTags();
    res.status(200).json({ success: true, tags });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tags" });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const tag = await ProductService.createTag(req.body);
    res.status(201).json({ success: true, tag });
  } catch (error) {
    res.status(500).json({ message: "Failed to create tag" });
  }
};

export const getTypes = async (req: Request, res: Response) => {
  try {
    const types = await ProductService.getTypes();
    res.status(200).json({ success: true, types });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch types" });
  }
};

export const createType = async (req: Request, res: Response) => {
  try {
    const type = await ProductService.createType(req.body);
    res.status(201).json({ success: true, type });
  } catch (error) {
    res.status(500).json({ message: "Failed to create type" });
  }
};

export const getFlavours = async (req: Request, res: Response) => {
  try {
    const flavours = await ProductService.getFlavours();
    res.status(200).json({ success: true, flavours });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch flavours" });
  }
};

export const createFlavour = async (req: Request, res: Response) => {
  try {
    const flavour = await ProductService.createFlavour(req.body);
    res.status(201).json({ success: true, flavour });
  } catch (error) {
    res.status(500).json({ message: "Failed to create flavour" });
  }
};

export const updateFlavour = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const flavour = await ProductService.updateFlavour(id as string, req.body);
    res.status(200).json({ success: true, flavour });
  } catch (error) {
    res.status(500).json({ message: "Failed to update flavour" });
  }
};

export const deleteFlavour = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ProductService.deleteFlavour(id as string);
    res.status(200).json({ success: true, message: "Flavour deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete flavour" });
  }
};
