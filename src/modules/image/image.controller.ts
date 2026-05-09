import { Request, Response } from "express";
import { prisma } from "../../common/lib/prisma";

/**
 * Image Streaming Controller
 * High-performance binary streaming for database-hosted assets.
 */
export const getImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ message: "Valid image ID is required" });
    }

    // UUID validation - softened to allow non-standard IDs but still avoid Prisma errors if possible
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id as string);

    let image: any = null;

    if (isUUID) {
      image = await prisma.productImage.findUnique({
        where: { id: id as string }
      });
    } else {
      // If not a UUID, try to find by the 'url' field which might store filenames
      image = await prisma.productImage.findFirst({
        where: { url: id as string }
      });
    }

    // If still not found in product images, check blog featured images
    if (!image || !image.data) {
      // Check blog by ID (if UUID)
      if (isUUID) {
        const blog = await prisma.blog.findUnique({
          where: { id: id as string },
          select: { featuredImageData: true, featuredImageMimeType: true }
        });
        
        if (blog && blog.featuredImageData) {
          image = {
            data: blog.featuredImageData,
            mimeType: blog.featuredImageMimeType
          };
        }
      }
      
      // If still not found, check blog by featuredImage filename
      if (!image) {
        const blog = await prisma.blog.findFirst({
          where: { featuredImage: id as string },
          select: { featuredImageData: true, featuredImageMimeType: true }
        });
        
        if (blog && blog.featuredImageData) {
          image = {
            data: blog.featuredImageData,
            mimeType: blog.featuredImageMimeType
          };
        }
      }
    }

    if (!image || !image.data) {
      console.log(`[ImageServer] 404: Image ${id} not found in database`);
      return res.status(404).json({ message: "Image not found" });
    }

    console.log(`[ImageServer] Streaming asset ${id} (${image.mimeType}) - Size: ${image.data.length} bytes`);

    // Set binary headers for cinematic delivery with CORP relaxation
    res.setHeader("Content-Type", image.mimeType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 days cache
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    
    return res.send(image.data);
  } catch (error) {
    console.error("[ImageServer] Stream failure for ID:", req.params.id, error);
    res.status(500).json({ message: "Internal server error" });
  }
};
