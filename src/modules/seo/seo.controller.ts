import { Request, Response } from "express";
import { SeoService } from "./seo.service";

export const getSeoBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const seo = await SeoService.getSeoBySlug(slug as string);
    res.status(200).json({ success: true, seo });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch SEO data" });
  }
};

export const getAllSeo = async (req: Request, res: Response) => {
  try {
    const seoEntries = await SeoService.getAllSeo();
    res.status(200).json({ success: true, seoEntries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch SEO entries" });
  }
};

export const getSeoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const seo = await SeoService.getSeoById(id as string);

    if (!seo) {
      return res.status(404).json({ success: false, message: "SEO entry not found" });
    }

    res.status(200).json({ success: true, seo });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch SEO entry" });
  }
};

export const upsertSeo = async (req: Request, res: Response) => {
  try {
    if (!req.body.pageSlug) {
      return res.status(400).json({ success: false, message: "pageSlug is required" });
    }

    const seo = await SeoService.upsertSeo(req.body);
    res.status(200).json({ success: true, message: "SEO settings saved", seo });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to save SEO settings" });
  }
};

export const deleteSeo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await SeoService.deleteSeo(id as string);
    res.status(200).json({ success: true, message: "SEO entry deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to delete SEO entry" });
  }
};

export const bulkUpsertSeo = async (req: Request, res: Response) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: "entries array is required" });
    }

    const results = await SeoService.bulkUpsertSeo(entries);
    res.status(200).json({ success: true, message: `${results.length} SEO entries saved`, results });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to bulk update SEO" });
  }
};

export const getGlobalSeo = async (req: Request, res: Response) => {
  try {
    const settings = await SeoService.getGlobalSettings();
    res.status(200).json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to fetch global SEO" });
  }
};

export const updateGlobalSeo = async (req: Request, res: Response) => {
  try {
    const settings = await SeoService.updateGlobalSettings(req.body);
    res.status(200).json({ success: true, message: "Global SEO saved", settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to save global SEO" });
  }
};
