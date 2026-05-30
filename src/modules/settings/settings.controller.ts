import { Request, Response } from "express";
import { SettingsService } from "./settings.service";

export const getStoreSettings = async (req: Request, res: Response) => {
  try {
    const settings = await SettingsService.getStoreSettings();
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error("Fetch store settings error:", error);
    res.status(500).json({ message: "Failed to fetch store settings" });
  }
};

export const updateStoreSettings = async (req: Request, res: Response) => {
  try {
    const settings = await SettingsService.updateStoreSettings(req.body);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ message: "Failed to update store settings" });
  }
};

export const getRegions = async (req: Request, res: Response) => {
  try {
    const regions = await SettingsService.getRegions();
    res.status(200).json({ success: true, regions });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch regions" });
  }
};

export const createRegion = async (req: Request, res: Response) => {
  try {
    const region = await SettingsService.createRegion(req.body);
    res.status(201).json({ success: true, region });
  } catch (error) {
    res.status(500).json({ message: "Failed to create region" });
  }
};

export const deleteRegion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await SettingsService.deleteRegion(id);
    res.status(200).json({ success: true, message: "Region deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete region" });
  }
};

export const getReturnReasons = async (req: Request, res: Response) => {
  try {
    const reasons = await SettingsService.getReturnReasons();
    res.status(200).json({ success: true, reasons });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch return reasons" });
  }
};

export const getRefundReasons = async (req: Request, res: Response) => {
  try {
    const reasons = await SettingsService.getRefundReasons();
    res.status(200).json({ success: true, reasons });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch refund reasons" });
  }
};
