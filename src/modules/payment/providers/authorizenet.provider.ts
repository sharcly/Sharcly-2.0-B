import { PaymentProviderInterface } from "./provider.interface";
import { prisma } from "../../../common/lib/prisma";
import { encrypt, decrypt } from "../../../common/utils/encryption";

export class AuthorizeNetProvider implements PaymentProviderInterface {
  async connect(userId: string, data: any): Promise<any> {
    const credentialsStr = JSON.stringify({
      apiLoginId: data.apiLoginId,
      transactionKey: data.transactionKey,
      sandbox: data.sandbox !== false
    });

    return await prisma.paymentIntegration.upsert({
      where: { gatewayName: "authorizenet" },
      update: {
        userId,
        authType: data.authType || "credentials",
        accessToken: data.accessToken ? encrypt(data.accessToken) : null,
        refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
        encryptedCredentials: encrypt(credentialsStr),
        status: "CONNECTED",
        lastSyncAt: new Date()
      },
      create: {
        userId,
        gatewayName: "authorizenet",
        authType: data.authType || "credentials",
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
    return !!(credentials.apiLoginId && credentials.transactionKey);
  }

  async chargeCard(amount: number, currency: string, cardData: any, orderId: string): Promise<any> {
    console.log(`[AUTHORIZE.NET] Processing card sale: $${amount} ${currency}`);
    // Simulate Authorize.net AIM transaction response
    return {
      id: "authnet_trans_" + Math.random().toString(10).substring(2, 12),
      status: "approved",
      amount: amount,
      orderId
    };
  }

  async createPaymentIntent(amount: number, currency: string, metadata: any): Promise<any> {
    return {
      id: "authnet_intent_" + Math.random().toString(36).substring(2, 15),
      client_secret: "authnet_mock_secret_" + Math.random().toString(36).substring(2, 10),
      status: "created"
    };
  }

  async getPayments(gatewayId: string): Promise<any[]> {
    return [
      { id: "authnet_ch_1", amount: 150.00, currency: "USD", status: "settled", customer: "authnet_user@sharcly.com", createdAt: new Date() }
    ];
  }

  async getRefunds(gatewayId: string): Promise<any[]> {
    return [];
  }

  async getCustomers(gatewayId: string): Promise<any[]> {
    return [
      { id: "authnet_cus_1", email: "authnet_user@sharcly.com", name: "Audrey Hepburn", createdAt: new Date() }
    ];
  }

  async getSubscriptions(gatewayId: string): Promise<any[]> {
    return [];
  }

  async createWebhook(gatewayId: string, webhookUrl: string): Promise<string> {
    return "webhook_authorizenet_mock_secret";
  }

  async syncTransactions(gatewayId: string): Promise<any> {
    await prisma.paymentIntegration.update({
      where: { id: gatewayId },
      data: { lastSyncAt: new Date() }
    });
    return { success: true, count: 1 };
  }
}
