import { Request, Response } from "express";
import { OrderService } from "./order.service";
import { InvoiceService } from "./invoice.service";
import { PaymentService } from "../payment/payment.service";
import { PaymentProviderFactory } from "../payment/providers/factory";
import { prisma } from "../../common/lib/prisma";
import { OrderStatus } from "@prisma/client";

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

    // Dynamic rotation and payment authorization for online card payments
    if (orderData.paymentMethod === "online") {
      let activeGateway;
      if (orderData.gatewayId) {
        const gw = await prisma.paymentGateway.findFirst({
          where: { id: orderData.gatewayId, isActive: true }
        });
        if (gw) {
          activeGateway = {
            publishableKey: gw.publishableKey || "",
            gatewayId: gw.id,
            gatewayName: gw.provider
          };
        }
      }

      if (!activeGateway) {
        activeGateway = await PaymentService.getActiveGatewayForCheckout();
      }

      if (activeGateway.gatewayName === "stripe") {
        // Create Stripe payment intent
        const paymentIntent = await PaymentService.createPaymentIntent(
          Number(order.totalAmount),
          "usd",
          { orderId: order.id },
          activeGateway.gatewayId
        );

        // Increment counts on the Stripe payment gateway
        if (activeGateway.gatewayId !== "env-fallback") {
          await prisma.paymentGateway.update({
            where: { id: activeGateway.gatewayId },
            data: {
              paymentCount: { increment: 1 },
              totalPayments: { increment: 1 }
            }
          });
        }

        return res.status(201).json({
          success: true,
          order,
          clientSecret: paymentIntent.client_secret
        });
      } else {
        // Direct credit card charging via non-Stripe providers
        const provider = PaymentProviderFactory.getProvider(activeGateway.gatewayName);
        const chargeResult = await provider.chargeCard(
          Number(order.totalAmount),
          "usd",
          orderData.cardData,
          order.id
        );

        // Update order status to CONFIRMED on successful charge
        const confirmedOrder = await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CONFIRMED }
        });

        // Increment counts on the non-Stripe payment gateway
        if (activeGateway.gatewayId !== "env-fallback") {
          await prisma.paymentGateway.update({
            where: { id: activeGateway.gatewayId },
            data: {
              paymentCount: { increment: 1 },
              totalPayments: { increment: 1 }
            }
          });
        }

        return res.status(201).json({
          success: true,
          order: confirmedOrder,
          chargeResult
        });
      }
    }

    res.status(201).json({ success: true, order });
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

export const previewOrder = async (req: Request, res: Response) => {
  try {
    const summary = await OrderService.previewOrder(req.body);
    res.status(200).json({ success: true, summary });
  } catch (error: any) {
    console.error("Order preview error:", error);
    res.status(400).json({ message: error.message || "Failed to preview order" });
  }
};

export const getOrderById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const order = await OrderService.getOrderById(id as string);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // IDOR fix: only allow owner or admin/manager/authorized role with orders.view to view order
    const roleSlug = req.user?.userRole?.slug?.toLowerCase().trim();
    const userPermissions = req.user?.userRole?.permissions.map((p: any) => p.permission.slug) || [];
    const isOwner = order.userId === req.user?.id;
    const hasOrderPermission = roleSlug === "super_admin" || 
                              roleSlug === "admin" || 
                              roleSlug === "manager" || 
                              roleSlug === "seo manager" ||
                              userPermissions.includes("orders.view") || 
                              userPermissions.includes("orders.manage");

    if (!isOwner && !hasOrderPermission) {
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

    // IDOR fix: only allow owner or admin/manager/authorized role with orders.view to view order
    const roleSlug = req.user?.userRole?.slug?.toLowerCase().trim();
    const userPermissions = req.user?.userRole?.permissions.map((p: any) => p.permission.slug) || [];
    const isOwner = order.userId === req.user?.id;
    const hasOrderPermission = roleSlug === "super_admin" || 
                              roleSlug === "admin" || 
                              roleSlug === "manager" || 
                              roleSlug === "seo manager" ||
                              userPermissions.includes("orders.view") || 
                              userPermissions.includes("orders.manage");

    if (!isOwner && !hasOrderPermission) {
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
