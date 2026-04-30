import { Request, Response } from "express";
import { ShippingService } from "./shipping.service";

// Shipping Methods
export const getAllMethods = async (req: Request, res: Response) => {
  try {
    const methods = await ShippingService.getAllMethods();
    res.status(200).json({ success: true, methods });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch shipping methods" });
  }
};

export const createMethod = async (req: Request, res: Response) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: "name and code are required" });
    }

    const method = await ShippingService.createMethod(req.body);
    res.status(201).json({ success: true, method });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "Shipping method with this name or code already exists" });
    }
    res.status(500).json({ success: false, message: "Failed to create shipping method" });
  }
};

export const updateMethod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const method = await ShippingService.updateMethod(id as string, req.body);
    res.status(200).json({ success: true, method });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Shipping method not found" });
    }
    res.status(500).json({ success: false, message: "Failed to update shipping method" });
  }
};

export const deleteMethod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ShippingService.deleteMethod(id as string);
    res.status(200).json({ success: true, message: "Shipping method deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Shipping method not found" });
    }
    res.status(500).json({ success: false, message: "Failed to delete shipping method" });
  }
};

// Shipping Zones
export const getAllZones = async (req: Request, res: Response) => {
  try {
    const zones = await ShippingService.getAllZones();
    res.status(200).json({ success: true, zones });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch shipping zones" });
  }
};

export const getZoneById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const zone = await ShippingService.getZoneById(id as string);

    if (!zone) {
      return res.status(404).json({ success: false, message: "Shipping zone not found" });
    }

    res.status(200).json({ success: true, zone });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch shipping zone" });
  }
};

export const createZone = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    const zone = await ShippingService.createZone(req.body);
    res.status(201).json({ success: true, zone });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "Zone with this name already exists" });
    }
    res.status(500).json({ success: false, message: "Failed to create shipping zone" });
  }
};

export const updateZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const zone = await ShippingService.updateZone(id as string, req.body);
    res.status(200).json({ success: true, zone });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Shipping zone not found" });
    }
    res.status(500).json({ success: false, message: "Failed to update shipping zone" });
  }
};

export const deleteZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ShippingService.deleteZone(id as string);
    res.status(200).json({ success: true, message: "Shipping zone deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Shipping zone not found" });
    }
    res.status(500).json({ success: false, message: "Failed to delete shipping zone" });
  }
};

// Shipping Rates
export const createRate = async (req: Request, res: Response) => {
  try {
    const { zoneId, methodId, price } = req.body;
    if (!zoneId || !methodId || price === undefined) {
      return res.status(400).json({ success: false, message: "zoneId, methodId, and price are required" });
    }

    const rate = await ShippingService.createRate(req.body);
    res.status(201).json({ success: true, rate });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create shipping rate" });
  }
};

export const updateRate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rate = await ShippingService.updateRate(id as string, req.body);
    res.status(200).json({ success: true, rate });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Shipping rate not found" });
    }
    res.status(500).json({ success: false, message: "Failed to update shipping rate" });
  }
};

export const deleteRate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ShippingService.deleteRate(id as string);
    res.status(200).json({ success: true, message: "Shipping rate deleted" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Shipping rate not found" });
    }
    res.status(500).json({ success: false, message: "Failed to delete shipping rate" });
  }
};

// Public Calculation
export const calculateShipping = async (req: Request, res: Response) => {
  try {
    const { country } = req.body;
    if (!country) {
      return res.status(400).json({ success: false, message: "country is required" });
    }

    const options = await ShippingService.calculateShipping(req.body);
    res.status(200).json({ success: true, options });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to calculate shipping" });
  }
};
