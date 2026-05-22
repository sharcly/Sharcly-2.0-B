import { Request, Response } from "express";
import { OrderService } from "./order.service";
import { InvoiceService } from "./invoice.service";

export const createOrder = async (req: any, res: Response) => {
  try {
    const orderData = req.body;
    const userId = req.user?.id || undefined;

    // Require email for guest orders
    const email = req.user?.email || req.body.email;
    if (!email) {
      return res.status(400).json({ message: "Email is required to place an order" });
    }

    const { order, clientSecret } = await OrderService.createOrder(userId, email, orderData);
    res.status(201).json({ success: true, order, clientSecret });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Order placement failed" });
  }
};

export const previewOrder = async (req: any, res: Response) => {
  try {
    const email = req.user?.email || req.body.email;
    const summary = await OrderService.previewOrder(req.body, email);
    res.status(200).json({ success: true, summary });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Calculation failed" });
  }
};

export const getMyOrders = async (req: any, res: Response) => {
  try {
    const orders = await OrderService.getMyOrders(req.user.id);
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Fetch orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await OrderService.getAllOrders();
    res.status(200).json({ success: true, orders });
  } catch (error: any) {
    console.error("Fetch all orders error:", error);
    res.status(500).json({ 
      message: "Failed to fetch all orders",
      error: error.message 
    });
  }
};

export const getOrderById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const order = await OrderService.getOrderById(id as string);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // IDOR fix: only allow owner or admin/manager to view order
    const isAdmin = ["admin", "super_admin", "manager"].includes(req.user?.userRole?.slug);
    if (!isAdmin && order.userId !== req.user?.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Fetch order details error:", error);
    res.status(500).json({ message: "Failed to fetch order details" });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await OrderService.updateOrderStatus(id as string, req.body);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Order status update error:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
};

export const downloadInvoice = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const order = await OrderService.getOrderById(id as string);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // IDOR fix: only allow owner or admin/manager to view order
    const isAdmin = ["admin", "super_admin", "manager"].includes(req.user?.userRole?.slug);
    if (!isAdmin && order.userId !== req.user?.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${id.slice(0, 8)}.pdf`);

    await InvoiceService.generateInvoice(order, res);
  } catch (error) {
    console.error("Invoice generation error:", error);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
};

export const cancelOrder = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ message: "Cancellation reason is required" });
    }

    const order = await OrderService.cancelOrder(id, req.user.id, reason);
    res.status(200).json({ success: true, order });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to cancel order" });
  }
};
