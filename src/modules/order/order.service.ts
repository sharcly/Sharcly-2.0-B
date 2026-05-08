import { prisma } from "../../common/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { sendOrderConfirmation } from "../auth/email.service";
import { KlaviyoService } from "../marketing/klaviyo.service";
import { SeoService } from "../seo/seo.service";
import { PaymentService } from "../payment/payment.service";

import crypto from "crypto";
import bcrypt from "bcryptjs";

export class OrderService {
  static async calculateOrderTotals(orderData: any) {
    const { items, couponCode } = orderData;
    
    let subtotal = 0;
    const itemsWithPrice = [];

    for (const item of items) {
      let product = await prisma.product.findUnique({ where: { id: item.productId } });
      let variant = null;

      if (!product) {
        variant = await prisma.productVariant.findUnique({ 
          where: { id: item.productId }, 
          include: { product: true } 
        });
        if (variant) {
           product = variant.product;
        } else {
           throw new Error("One or more items in your cart are unavailable.");
        }
      }

      const price = variant ? Number(variant.price) : Number(product.price);
      subtotal += price * item.quantity;
      itemsWithPrice.push({
        ...item,
        productId: product.id,
        variantId: variant ? variant.id : undefined,
        price,
        name: product.name,
        image: product.ogImage
      });
    }

    // Coupon Calculation
    let couponId: string | undefined = undefined;
    let discountAmount = 0;
    let couponDetails = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode as string } });
      if (coupon && coupon.expiryDate > new Date() && coupon.usedCount < coupon.usageLimit) {
        if (coupon.discountType === "PERCENTAGE") {
          discountAmount = (subtotal * Number(coupon.discount)) / 100;
        } else {
          discountAmount = Number(coupon.discount);
        }
        couponId = coupon.id;
        couponDetails = coupon;
      } else if (couponCode) {
         throw new Error("Coupon is invalid, expired, or has reached its usage limit.");
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);

    // Tax and Shipping
    const settings = await prisma.storeSettings.findFirst();
    let taxAmount = 0;
    let shippingCost = 0;

    if (settings) {
      const taxRate = Number(settings.taxRate) || 0;
      taxAmount = (discountedSubtotal * taxRate) / 100;
      
      const shippingCharge = Number(settings.shippingCharge) || 0;
      const freeShippingThreshold = Number(settings.freeShippingThreshold) || 0;
      shippingCost = (freeShippingThreshold > 0 && discountedSubtotal >= freeShippingThreshold) ? 0 : shippingCharge;
    }

    const totalAmount = discountedSubtotal + taxAmount + shippingCost;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      shippingAmount: shippingCost,
      totalAmount,
      couponId,
      couponDetails,
      items: itemsWithPrice
    };
  }

  static async createOrder(userId: string | undefined, email: string, orderData: any) {
    const { shippingAddress, billingAddress, paymentMethod } = orderData;

    // 1. Calculate Totals (Backend Source of Truth)
    const totals = await this.calculateOrderTotals(orderData);

    // 2. Secure user identification
    let finalUserId = userId;
    if (!finalUserId) {
      let guestUser = await prisma.user.findUnique({ where: { email } });
      if (!guestUser) {
        const userRole = await prisma.role.findUnique({ where: { slug: "user" } });
        const isCreatingAccount = !!orderData.password;
        const displayName = orderData.name || (shippingAddress?.split(',')[0] || "Guest Shopper");
        const passwordToUse = isCreatingAccount 
          ? await bcrypt.hash(orderData.password, 10)
          : `guest_${crypto.randomBytes(16).toString("hex")}`;

        guestUser = await prisma.user.create({
          data: {
             email,
             password: passwordToUse,
             name: displayName,
             ...(userRole ? { roleId: userRole.id } : {})
          }
        });
      }
      finalUserId = guestUser.id;
    }

    // 3. Stock Validation
    for (const item of totals.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      const variant = item.variantId ? await prisma.productVariant.findUnique({ where: { id: item.variantId } }) : null;
      const targetStock = variant ? variant.inventoryQuantity : (product?.stock || 0);
      
      if (targetStock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }
    }

    // 4. Create order, update stock, and increment coupon usage in transaction
    const order = await prisma.$transaction(async (tx: any) => {
      if (totals.couponId) {
        const coupon = await tx.coupon.findUnique({ where: { id: totals.couponId } });
        if (!coupon || coupon.usedCount >= coupon.usageLimit || coupon.expiryDate <= new Date()) {
          throw new Error("Coupon is no longer valid.");
        }
        await tx.coupon.update({
          where: { id: totals.couponId },
          data: { usedCount: { increment: 1 } }
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId: finalUserId as string,
          totalAmount: totals.totalAmount,
          taxAmount: totals.taxAmount,
          shippingAmount: totals.shippingAmount,
          address: shippingAddress,
          shippingAddress,
          billingAddress: billingAddress || shippingAddress,
          paymentMethod,
          status: OrderStatus.PENDING,
          couponId: totals.couponId,
          items: {
            create: totals.items.map(oi => ({
               productId: oi.productId,
               quantity: oi.quantity,
               price: oi.price
            }))
          }
        },
        include: { items: true }
      });

      // Update stock
      for (const item of totals.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { inventoryQuantity: { decrement: item.quantity } }
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });
        }
      }

      return newOrder;
    });

    // 5. Handle Stripe Payment Intent if online
    let clientSecret: string | undefined = undefined;
    if (paymentMethod === 'online') {
      try {
        const paymentIntent = await PaymentService.createPaymentIntent(
          totals.totalAmount,
          "usd",
          { orderId: order.id, userId: finalUserId }
        );
        clientSecret = paymentIntent.client_secret || undefined;
      } catch (pErr: any) {
        console.error("Stripe Payment Intent Creation Failed:", pErr);
        // Throwing error here is critical so the user doesn't think the order was successful when payment failed to initiate
        throw new Error(`Failed to initialize payment: ${pErr.message || "Stripe error"}`);
      }
    }

    // Klaviyo Tracking
    try {
      const seoSettings = await SeoService.getGlobalSettings();
      KlaviyoService.init(seoSettings?.klaviyoPrivateKey || undefined);
      await KlaviyoService.trackEvent(email, "Placed Order", {
        "$value": Number(order.totalAmount),
        "OrderID": order.id,
        "ItemNames": order.items.map((i: any) => i.productId), // ideally fetch names
        "ShippingAddress": order.shippingAddress,
        "BillingAddress": order.billingAddress,
      });
    } catch (kErr) {
      console.warn("Klaviyo Order Tracking Failed:", kErr);
    }

    // Send Email Confirmation
    try {
      await sendOrderConfirmation(email, order);
    } catch (eErr) {
      console.warn("Email Confirmation Failed:", eErr);
    }

    return { order, clientSecret };
  }

  static async getMyOrders(userId: string) {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" }
    });

    const settings = await prisma.storeSettings.findFirst();
    return orders.map((order: any) => this.applyLegacyFallback(order, settings));
  }

  static async getAllOrders() {
    const orders = await prisma.order.findMany({
      include: { 
        user: { select: { name: true, email: true } }, 
        items: { include: { product: true } } 
      },
      orderBy: { createdAt: "desc" },
      take: 500 // Limit to prevent timeouts on massive datasets
    });

    const settings = await prisma.storeSettings.findFirst();
    return orders.map((order: any) => this.applyLegacyFallback(order, settings));
  }

  static async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { 
        user: { select: { name: true, email: true } }, 
        items: { include: { product: true } },
        coupon: true
      }
    });

    if (!order) return null;
    const settings = await prisma.storeSettings.findFirst();
    return this.applyLegacyFallback(order, settings);
  }

  static async previewOrder(orderData: any) {
    return await this.calculateOrderTotals(orderData);
  }

  private static applyLegacyFallback(order: any, settings: any) {
    if (!order) return order;

    // Defensive check: ensure items is an array
    const items = order.items || [];
    const itemsSubtotal = items.reduce((acc: number, item: any) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      return acc + (price * quantity);
    }, 0);

    const total = Number(order.totalAmount) || 0;
    const recordedTax = Number(order.taxAmount || 0);
    const recordedShipping = Number(order.shippingAmount || 0);

    if (recordedTax === 0 && recordedShipping === 0 && total > itemsSubtotal && settings) {
      const taxRate = Number(settings.taxRate) || 0;
      const inferredTax = (itemsSubtotal * taxRate) / 100;
      const inferredShipping = Math.max(0, total - itemsSubtotal - inferredTax);
      
      return {
        ...order,
        taxAmount: inferredTax,
        shippingAmount: inferredShipping
      };
    }

    return order;
  }

  static async updateOrderStatus(id: string, updateData: any) {
    const { status, trackingNumber, carrier, estimatedDelivery, notes } = updateData;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        status: status as OrderStatus,
        trackingNumber: trackingNumber || undefined,
        carrier: carrier || undefined,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        notes: notes || undefined
      },
      include: { 
        user: { select: { email: true, name: true } },
        items: { include: { product: true } }
      }
    });

    // Send Status Update Email
    try {
      const { sendOrderStatusUpdate } = require("../auth/email.service");
      await sendOrderStatusUpdate(updatedOrder.user.email, updatedOrder);
    } catch (eErr) {
      console.warn("Status Update Email Failed:", eErr);
    }

    return updatedOrder;
  }

  static async cancelOrder(id: string, userId: string, cancelReason: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Access denied");
    if (!([OrderStatus.PENDING, OrderStatus.CONFIRMED] as OrderStatus[]).includes(order.status)) {
      throw new Error(`Order cannot be cancelled because it is already ${order.status.toLowerCase()}.`);
    }

    return await prisma.$transaction(async (tx: any) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { 
          status: OrderStatus.CANCELLED,
          cancelReason
        }
      });

      // Restore stock
      for (const item of order.items) {
        // We need to check if it was a variant or base product
        // OrderItem only has productId. In a better schema we'd have variantId in OrderItem.
        // For now, let's look at the product stock.
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        });
      }

      // Send Cancellation Email
      try {
        const { sendOrderStatusUpdate } = require("../auth/email.service");
        // We fetch the user email from the order if not available, but here we can just use the userId to fetch user
        const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (user) {
          await sendOrderStatusUpdate(user.email, updatedOrder);
        }
      } catch (eErr) {
        console.warn("Cancellation Email Failed:", eErr);
      }

      return updatedOrder;
    });
  }
}
