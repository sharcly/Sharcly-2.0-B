import { PaymentProviderInterface } from "./provider.interface";
import { prisma } from "../../../common/lib/prisma";
import { encrypt, decrypt } from "../../../common/utils/encryption";

export class RazorpayProvider implements PaymentProviderInterface {
  async connect(userId: string, data: any): Promise<any> {
    const credentialsStr = JSON.stringify({
      keyId: data.keyId,
      keySecret: data.keySecret
    });

    return await prisma.paymentIntegration.upsert({
      where: { gatewayName: "razorpay" },
      update: {
        userId,
        authType: "credentials",
        encryptedCredentials: encrypt(credentialsStr),
        status: "CONNECTED",
        lastSyncAt: new Date()
      },
      create: {
        userId,
        gatewayName: "razorpay",
        authType: "credentials",
        encryptedCredentials: encrypt(credentialsStr),
        status: "CONNECTED",
        lastSyncAt: new Date()
      }
    });
  }

  async disconnect(gatewayId: string): Promise<boolean> {
    await prisma.paymentIntegration.update({
      where: { id: gatewayId },
      data: {
        status: "DISCONNECTED",
        accessToken: null,
        refreshToken: null,
        encryptedCredentials: null
      }
    });
    return true;
  }

  async testConnection(credentials: any): Promise<boolean> {
    return !!(credentials.keyId && credentials.keySecret);
  }

  async chargeCard(amount: number, currency: string, cardData: any, orderId: string): Promise<any> {
    console.log(`[RAZORPAY] Capture payment: INR ${amount * 80}`); // Razorpay commonly processes in INR, let's keep usd or simulate conversion
    return {
      id: "pay_rzp_" + Math.random().toString(36).substring(2, 15),
      status: "captured",
      amount: amount,
      orderId
    };
  }

  async createPaymentIntent(amount: number, currency: string, metadata: any): Promise<any> {
    return {
      id: "rzp_order_" + Math.random().toString(36).substring(2, 15),
      client_secret: "rzp_mock_secret_" + Math.random().toString(36).substring(2, 10),
      status: "created"
    };
  }

  async getPayments(gatewayId: string): Promise<any[]> {
    return [
      { id: "pay_rzp_1", amount: 120.00, currency: "INR", status: "captured", customer: "razor_user@sharcly.in", createdAt: new Date() }
    ];
  }

  async getRefunds(gatewayId: string): Promise<any[]> {
    return [];
  }

  async getCustomers(gatewayId: string): Promise<any[]> {
    return [
      { id: "rzp_cus_1", email: "razor_user@sharcly.in", name: "Rahul Sharma", createdAt: new Date() }
    ];
  }

  async getSubscriptions(gatewayId: string): Promise<any[]> {
    return [];
  }

  async createWebhook(gatewayId: string, webhookUrl: string): Promise<string> {
    return "webhook_razorpay_mock_secret";
  }

  async syncTransactions(gatewayId: string): Promise<any> {
    await prisma.paymentIntegration.update({
      where: { id: gatewayId },
      data: { lastSyncAt: new Date() }
    });
    return { success: true, count: 1 };
  }
}
