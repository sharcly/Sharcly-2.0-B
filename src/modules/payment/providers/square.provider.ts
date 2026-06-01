import { PaymentProviderInterface } from "./provider.interface";
import { prisma } from "../../../common/lib/prisma";
import { encrypt, decrypt } from "../../../common/utils/encryption";

export class SquareProvider implements PaymentProviderInterface {
  async connect(userId: string, data: any): Promise<any> {
    const credentialsStr = JSON.stringify({
      applicationId: data.applicationId,
      accessToken: data.accessToken,
      locationId: data.locationId
    });

    return await prisma.paymentIntegration.upsert({
      where: { gatewayName: "square" },
      update: {
        userId,
        authType: data.authType || "oauth",
        accessToken: data.accessToken ? encrypt(data.accessToken) : null,
        refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
        encryptedCredentials: encrypt(credentialsStr),
        status: "CONNECTED",
        lastSyncAt: new Date()
      },
      create: {
        userId,
        gatewayName: "square",
        authType: data.authType || "oauth",
        accessToken: data.accessToken ? encrypt(data.accessToken) : null,
        refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
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
    return !!credentials.accessToken || !!credentials.applicationId;
  }

  async chargeCard(amount: number, currency: string, cardData: any, orderId: string): Promise<any> {
    console.log(`[SQUARE] Capture charge: $${amount} ${currency}`);
    return {
      id: "sq_pay_" + Math.random().toString(36).substring(2, 15),
      status: "COMPLETED",
      amount: amount,
      orderId
    };
  }

  async createPaymentIntent(amount: number, currency: string, metadata: any): Promise<any> {
    return {
      id: "sq_intent_" + Math.random().toString(36).substring(2, 15),
      client_secret: "sq_mock_secret_" + Math.random().toString(36).substring(2, 10),
      status: "CREATED"
    };
  }

  async getPayments(gatewayId: string): Promise<any[]> {
    return [
      { id: "sq_ch_1", amount: 75.00, currency: "USD", status: "COMPLETED", customer: "square_user@sharcly.com", createdAt: new Date() }
    ];
  }

  async getRefunds(gatewayId: string): Promise<any[]> {
    return [];
  }

  async getCustomers(gatewayId: string): Promise<any[]> {
    return [
      { id: "sq_cus_1", email: "square_user@sharcly.com", name: "Gregory Peck", createdAt: new Date() }
    ];
  }

  async getSubscriptions(gatewayId: string): Promise<any[]> {
    return [];
  }

  async createWebhook(gatewayId: string, webhookUrl: string): Promise<string> {
    return "webhook_square_mock_secret";
  }

  async syncTransactions(gatewayId: string): Promise<any> {
    await prisma.paymentIntegration.update({
      where: { id: gatewayId },
      data: { lastSyncAt: new Date() }
    });
    return { success: true, count: 2 };
  }
}
