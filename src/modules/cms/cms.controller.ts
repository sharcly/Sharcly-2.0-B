import { Request, Response } from "express";
import { CmsService } from "./cms.service";

export const getPageContent = async (req: Request, res: Response) => {
  try {
    const { page } = req.params as { page: string };
    const content = await CmsService.getPageContent(page);
    res.status(200).json({ success: true, content });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateContent = async (req: Request, res: Response) => {
  try {
    const { page, updates } = req.body; // updates: { section, key, value, type }[]
    
    if (!page || !Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    const results = await CmsService.bulkUpdate(page, updates);
    res.status(200).json({ success: true, message: "Content updated successfully", results });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadCmsImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const imageId = await CmsService.uploadImage(file);
    res.status(200).json({ success: true, imageId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Upload a hero video (max 20MB)
 * Replaces any existing video with the same purpose
 */
export const uploadCmsVideo = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No video file uploaded" });
    }

    const purpose = req.body.purpose || "hero";
    const video = await CmsService.uploadVideo(file, purpose);
    
    res.status(200).json({ 
      success: true, 
      video: {
        id: video.id,
        mimeType: video.mimeType,
        purpose: video.purpose,
        fileName: video.fileName,
        fileSize: video.fileSize,
        createdAt: video.createdAt
      }
    });
  } catch (error: any) {
    console.error("[CMS] Video upload failed:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get metadata for the hero video (or by purpose)
 */
export const getHeroVideo = async (req: Request, res: Response) => {
  try {
    const purpose = (req.query.purpose as string) || "hero";
    const video = await CmsService.getVideoByPurpose(purpose);
    
    // Return 200 with null video instead of 404 to avoid noisy console errors
    res.status(200).json({ success: true, video: video || null });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Stream a video by ID (binary delivery)
 */
export const streamVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ message: "Valid video ID is required" });
    }

    const video = await CmsService.getVideoData(id as string);
    
    if (!video || !video.data) {
      return res.status(404).json({ message: "Video not found" });
    }

    console.log(`[CMS Video] Streaming video ${id} (${video.mimeType}) - Size: ${video.data.length} bytes`);

    res.setHeader("Content-Type", video.mimeType || "video/mp4");
    res.setHeader("Content-Length", video.data.length.toString());
    res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 days cache
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Accept-Ranges", "bytes");
    
    return res.send(video.data);
  } catch (error) {
    console.error("[CMS Video] Stream failure for ID:", req.params.id, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Delete a video by ID
 */
export const deleteCmsVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await CmsService.deleteVideo(id as string);
    res.status(200).json({ success: true, message: "Video deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
