import { PaymentProviderInterface } from "./provider.interface";
import { prisma } from "../../../common/lib/prisma";
import { encrypt, decrypt } from "../../../common/utils/encryption";

export class BraintreeProvider implements PaymentProviderInterface {
  async connect(userId: string, data: any): Promise<any> {
    const credentialsStr = JSON.stringify({
      merchantId: data.merchantId,
      publicKey: data.publicKey,
      privateKey: data.privateKey,
      environment: data.environment || "sandbox"
    });

    return await prisma.paymentIntegration.upsert({
      where: { gatewayName: "braintree" },
      update: {
        userId,
        authType: "credentials",
        merchantId: data.merchantId,
        encryptedCredentials: encrypt(credentialsStr),
        status: "CONNECTED",
        lastSyncAt: new Date()
      },
      create: {
        userId,
        gatewayName: "braintree",
        authType: "credentials",
        merchantId: data.merchantId,
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
    return !!(credentials.merchantId && credentials.publicKey && credentials.privateKey);
  }

  async chargeCard(amount: number, currency: string, cardData: any, orderId: string): Promise<any> {
    console.log(`[BRAINTREE] Charging card via Transaction Sale: $${amount} ${currency}`);
    return {
      id: "bt_txn_" + Math.random().toString(36).substring(2, 15),
      status: "authorized_completed",
      amount: amount,
      orderId
    };
  }

  async createPaymentIntent(amount: number, currency: string, metadata: any): Promise<any> {
    // Braintree commonly uses client tokens rather than payment intents
    return {
      id: "bt_token_" + Math.random().toString(36).substring(2, 15),
      client_token: "bt_mock_client_token_" + Math.random().toString(36).substring(2, 10),
      status: "created"
    };
  }

  async getPayments(gatewayId: string): Promise<any[]> {
    return [
      { id: "bt_txn_1", amount: 89.99, currency: "USD", status: "settled", customer: "bt_user1@sharcly.com", createdAt: new Date() }
    ];
  }

  async getRefunds(gatewayId: string): Promise<any[]> {
    return [];
  }

  async getCustomers(gatewayId: string): Promise<any[]> {
    return [
      { id: "bt_cus_1", email: "bt_user1@sharcly.com", name: "Helena Bonham", createdAt: new Date() }
    ];
  }

  async getSubscriptions(gatewayId: string): Promise<any[]> {
    return [];
  }

  async createWebhook(gatewayId: string, webhookUrl: string): Promise<string> {
    return "webhook_braintree_mock_secret";
  }

  async syncTransactions(gatewayId: string): Promise<any> {
    await prisma.paymentIntegration.update({
      where: { id: gatewayId },
      data: { lastSyncAt: new Date() }
    });
    return { success: true, count: 1 };
  }
}
