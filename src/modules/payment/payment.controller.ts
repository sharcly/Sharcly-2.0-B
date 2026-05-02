import { Request, Response } from "express";
import { PaymentService } from "./payment.service";

export const getPaymentMethods = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const paymentMethods = await PaymentService.listPaymentMethods(userId);
    res.status(200).json({ success: true, paymentMethods });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePaymentMethod = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await PaymentService.deletePaymentMethod(id, userId);
    res.status(200).json({ success: true, message: "Payment method removed" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
