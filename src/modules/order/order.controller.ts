import { Request, Response } from "express";
import { OrderService } from "./order.service";
import { InvoiceService } from "./invoice.service";
import { PaymentService } from "../payment/payment.service";

export const createOrder = async (req: any, res: Response) => {
  try {
    const orderData = req.body;
    const userId = req.user?.id || undefined;

    // Require email for guest orders
    const email = req.user?.email || req.body.email;
    if (!email) {
      return res.status(400).json({ message: "Email is required to place an order" });
    }

    const order = await OrderService.createOrder(userId, email, orderData);

    let clientSecret: string | undefined = undefined;
    let directPaymentSuccess = false;

    if (orderData.paymentMethod === "online") {
      const activeGateway = await PaymentService.getActiveGatewayForCheckout();

      if (activeGateway.gatewayName === "stripe") {
        // Stripe uses client elements flow, return clientSecret
        const paymentIntent = await PaymentService.createPaymentIntent(
          Number(order.totalAmount),
          "usd",
          { orderId: order.id },
          activeGateway.gatewayId
        );
        clientSecret = paymentIntent.client_secret;
      } else {
        // Direct merchant card payment
        if (!orderData.cardData) {
          throw new Error("Credit Card details are required for online checkout.");
        }

        const chargeResult = await PaymentService.chargeCard(
          Number(order.totalAmount),
          "usd",
          orderData.cardData,
          order.id,
          activeGateway.gatewayId
        );

        const okStatuses = ["COMPLETED", "captured", "authorized_completed", "approved"];
        if (chargeResult && okStatuses.includes(chargeResult.status)) {
          directPaymentSuccess = true;
          // Set status to CONFIRMED
          await OrderService.updateOrderStatus(order.id, { status: "CONFIRMED" });
        } else {
          throw new Error("Direct merchant card authorization failed.");
        }
      }
    }

    res.status(201).json({ success: true, order, clientSecret, directPaymentSuccess });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Order placement failed" });
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
  } catch (error) {
    console.error("Fetch all orders error:", error);
    res.status(500).json({ message: "Failed to fetch all orders" });
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
    const isAdmin = ["admin", "manager"].includes(req.user?.userRole?.slug);
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
    const isAdmin = ["admin", "manager"].includes(req.user?.userRole?.slug);
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
