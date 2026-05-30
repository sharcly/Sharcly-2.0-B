import { Request, Response } from "express";
import { prisma } from "../../common/lib/prisma";

/**
 * Image Streaming Controller
 * High-performance binary streaming for database-hosted assets.
 */
export const getImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // UUID validation
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id as string)) {
      return res.status(400).json({ message: "Invalid image ID format" });
    }

    const image = await prisma.productImage.findUnique({
      where: { id: id as string }
    });

    if (!image || !image.data) {
      return res.status(404).json({ message: "Image not found" });
    }

    console.log(`[ImageServer] Streaming asset ${id} (${image.mimeType})`);

    // Set binary headers for cinematic delivery with CORP relaxation
    res.setHeader("Content-Type", image.mimeType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 days cache
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    
    return res.send(image.data);
  } catch (error) {
    console.error("[ImageServer] Stream failure:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
