export interface PaymentProviderInterface {
  connect(userId: string, credentials: any): Promise<any>;
  disconnect(gatewayId: string): Promise<boolean>;
  testConnection(credentials: any): Promise<boolean>;
  
  // Standard Checkout Methods
  chargeCard(amount: number, currency: string, cardData: any, orderId: string): Promise<any>;
  createPaymentIntent(amount: number, currency: string, metadata: any): Promise<any>;

  // Admin Management Sync Methods
  getPayments(gatewayId: string): Promise<any[]>;
  getRefunds(gatewayId: string): Promise<any[]>;
  getCustomers(gatewayId: string): Promise<any[]>;
  getSubscriptions(gatewayId: string): Promise<any[]>;
  
  // Webhooks & Syncing
  createWebhook(gatewayId: string, webhookUrl: string): Promise<string>;
  syncTransactions(gatewayId: string): Promise<any>;
}
