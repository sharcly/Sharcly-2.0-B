import sharp from "sharp";
import { prisma } from "../../common/lib/prisma";

export class ImageService {
  static async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(800, 800, {
          fit: "inside",
          withoutEnlargement: true
        })
        .webp({ quality: 75 })
        .toBuffer();
    } catch (error) {
      console.error("Image optimization error:", error);
      throw new Error("Failed to optimize image");
    }
  }

  static async processProductMedia(files: any[]): Promise<{ data: Buffer, mimeType: string }[]> {
    return await Promise.all(
      files.map(async (file) => {
        if (file.mimetype === "image/svg+xml") {
          return { data: file.buffer, mimeType: "image/svg+xml" };
        }
        const optimized = await this.optimizeImage(file.buffer);
        return { data: optimized, mimeType: "image/webp" };
      })
    );
  }

  static async getProductImage(id: string) {
    return await prisma.productImage.findUnique({
      where: { id }
    });
  }
}

// Keeping the original exports for backward compatibility within current turn if needed, 
// though we will update controllers.
export const optimizeImage = ImageService.optimizeImage.bind(ImageService);
export const processProductMedia = ImageService.processProductMedia.bind(ImageService);
