import { prisma } from "../../common/lib/prisma";
import { optimizeImage } from "../image/image.service";

export class CmsService {
  /**
   * Get all content for a specific page
   */
  static async getPageContent(page: string) {
    const content = await prisma.cmsContent.findMany({
      where: { page }
    });
    
    // Transform into a key-value object for easier frontend consumption
    return content.reduce((acc, curr) => {
      const sectionKey = curr.section;
      if (!acc[sectionKey]) acc[sectionKey] = {};
      
      let val: any = curr.value;
      if (curr.type === "json") {
        try { val = JSON.parse(curr.value); } catch (e) { val = curr.value; }
      }
      
      acc[sectionKey][curr.key] = val;
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Update or Create CMS content
   */
  static async upsertContent(page: string, section: string, key: string, value: string, type: string = "text") {
    return await prisma.cmsContent.upsert({
      where: {
        page_section_key: { page, section, key }
      },
      update: { value, type },
      create: { page, section, key, value, type }
    });
  }

  /**
   * Bulk update content for a page
   */
  static async bulkUpdate(page: string, data: { section: string; key: string; value: string; type?: string }[]) {
    const results = [];
    for (const item of data) {
      const res = await this.upsertContent(page, item.section, item.key, item.value, item.type || "text");
      results.push(res);
    }
    return results;
  }

  /**
   * Upload and optimize an image for CMS use
   */
  static async uploadImage(file: Express.Multer.File) {
    const optimizedData = await optimizeImage(file.buffer);
    
    // Create new CmsImage record
    const cmsImage = await prisma.cmsImage.create({
      data: {
        data: optimizedData,
        mimeType: "image/webp"
      }
    });

    return cmsImage.id;
  }

  /**
   * Upload a video for CMS use (e.g. hero section)
   * Replaces any existing video with the same purpose
   */
  static async uploadVideo(file: Express.Multer.File, purpose: string = "hero") {
    // Delete any existing video with the same purpose
    await prisma.cmsVideo.deleteMany({
      where: { purpose }
    });

    // Create new CmsVideo record
    const cmsVideo = await prisma.cmsVideo.create({
      data: {
        data: file.buffer,
        mimeType: file.mimetype,
        purpose,
        fileName: file.originalname,
        fileSize: file.size
      }
    });

    return cmsVideo;
  }

  /**
   * Get the latest video for a specific purpose
   */
  static async getVideoByPurpose(purpose: string) {
    return await prisma.cmsVideo.findFirst({
      where: { purpose },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        mimeType: true,
        purpose: true,
        fileName: true,
        fileSize: true,
        createdAt: true
      }
    });
  }

  /**
   * Get video binary data by ID for streaming
   */
  static async getVideoData(id: string) {
    return await prisma.cmsVideo.findUnique({
      where: { id }
    });
  }

  /**
   * Delete a video by ID
   */
  static async deleteVideo(id: string) {
    return await prisma.cmsVideo.delete({
      where: { id }
    });
  }
}


