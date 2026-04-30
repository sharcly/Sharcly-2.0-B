import { Request, Response } from "express";
import { AddressService } from "./address.service";

export const createAddress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const address = await AddressService.create(userId, req.body);
    res.status(201).json({ success: true, address });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAddresses = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const addresses = await AddressService.getByUser(userId);
    res.status(200).json({ success: true, addresses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    await AddressService.delete(id as string, userId);
    res.status(200).json({ success: true, message: "Address deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
