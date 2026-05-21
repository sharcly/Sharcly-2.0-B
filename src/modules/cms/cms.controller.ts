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

