import { prisma } from "../../common/lib/prisma";
import { encrypt, decrypt } from "../../common/utils/encryption";
import Stripe from "stripe";
import { Client as SquareClient, Environment as SquareEnvironment } from "square";
import Razorpay from "razorpay";
import braintree from "braintree";
import { z } from "zod";

// Zod Validation Schemas for each provider
export const StripeCredentialsSchema = z.object({
  publishableKey: z.string().min(1, "Publishable Key is required"),
  secretKey: z.string().min(1, "Secret Key is required"),
  webhookSecret: z.string().optional().nullable()
});

export const SquareCredentialsSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  accessToken: z.string().min(1, "Access Token is required"),
  locationId: z.string().min(1, "Location ID is required"),
  webhookSignatureKey: z.string().optional().nullable()
});

export const PaypalCredentialsSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  environment: z.enum(["sandbox", "live"])
});

export const RazorpayCredentialsSchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
  keySecret: z.string().min(1, "Key Secret is required")
});

export const BraintreeCredentialsSchema = z.object({
  merchantId: z.string().min(1, "Merchant ID is required"),
  publicKey: z.string().min(1, "Public Key is required"),
  privateKey: z.string().min(1, "Private Key is required"),
  environment: z.enum(["sandbox", "production"]).optional().default("sandbox")
});

export const AuthorizeNetCredentialsSchema = z.object({
  apiLoginId: z.string().min(1, "API Login ID is required"),
  transactionKey: z.string().min(1, "Transaction Key is required"),
  environment: z.enum(["sandbox", "live"]).optional().default("sandbox")
});

export const CREDENTIALS_SCHEMAS: Record<string, z.ZodSchema<any>> = {
  stripe: StripeCredentialsSchema,
  square: SquareCredentialsSchema,
  paypal: PaypalCredentialsSchema,
  razorpay: RazorpayCredentialsSchema,
  braintree: BraintreeCredentialsSchema,
  authorizenet: AuthorizeNetCredentialsSchema
};

export const PROVIDER_FIELDS: Record<string, { label: string; key: string; type: string; required: boolean; options?: string[] }[]> = {
  stripe: [
    { label: "Publishable Key", key: "publishableKey", type: "text", required: true },
    { label: "Secret Key", key: "secretKey", type: "password", required: true },
    { label: "Webhook Secret", key: "webhookSecret", type: "password", required: false }
  ],
  square: [
    { label: "Application ID", key: "applicationId", type: "text", required: true },
    { label: "Access Token", key: "accessToken", type: "password", required: true },
    { label: "Location ID", key: "locationId", type: "text", required: true },
    { label: "Webhook Signature Key", key: "webhookSignatureKey", type: "password", required: false }
  ],
  paypal: [
    { label: "Client ID", key: "clientId", type: "text", required: true },
    { label: "Client Secret", key: "clientSecret", type: "password", required: true },
    { label: "Environment", key: "environment", type: "select", required: true, options: ["sandbox", "live"] }
  ],
  razorpay: [
    { label: "Key ID", key: "keyId", type: "text", required: true },
    { label: "Key Secret", key: "keySecret", type: "password", required: true }
  ],
  braintree: [
    { label: "Merchant ID", key: "merchantId", type: "text", required: true },
    { label: "Public Key", key: "publicKey", type: "text", required: true },
    { label: "Private Key", key: "privateKey", type: "password", required: true },
    { label: "Environment", key: "environment", type: "select", required: false, options: ["sandbox", "production"] }
  ],
  authorizenet: [
    { label: "API Login ID", key: "apiLoginId", type: "text", required: true },
    { label: "Transaction Key", key: "transactionKey", type: "password", required: true },
    { label: "Environment", key: "environment", type: "select", required: false, options: ["sandbox", "live"] }
  ]
};

export class ProvidersService {
  /**
   * Validate and test connection to the payment provider using direct credentials.
   */
  static async testConnection(provider: string, credentials: any): Promise<{ success: boolean; error?: string }> {
    const providerLower = provider.toLowerCase();
    
    // 1. Zod validation
    const schema = CREDENTIALS_SCHEMAS[providerLower];
    if (!schema) {
      return { success: false, error: `Unsupported provider: ${provider}` };
    }
    
    const parsed = schema.safeParse(credentials);
    if (!parsed.success) {
      const messages = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
      return { success: false, error: `Validation error: ${messages}` };
    }

    const validatedCreds = parsed.data;

    // 2. Real API Connection Testing
    try {
      switch (providerLower) {
        case "stripe": {
          const stripe = new Stripe(validatedCreds.secretKey, { apiVersion: "2023-10-16" as any });
          await stripe.balance.retrieve();
          return { success: true };
        }
        case "square": {
          const square = new SquareClient({
            accessToken: validatedCreds.accessToken,
            environment: SquareEnvironment.Sandbox
          });
          const response = await square.locationsApi.listLocations();
          const locations = response.result.locations || [];
          const exists = locations.some(loc => loc.id === validatedCreds.locationId);
          if (!exists) {
            return { success: false, error: `Location ID ${validatedCreds.locationId} was not found on this Square account.` };
          }
          return { success: true };
        }
        case "paypal": {
          const isLive = validatedCreds.environment === "live";
          const host = isLive ? "api-m.paypal.com" : "api-m.sandbox.paypal.com";
          const basicAuth = Buffer.from(`${validatedCreds.clientId}:${validatedCreds.clientSecret}`).toString("base64");
          
          const res = await fetch(`https://${host}/v1/oauth2/token`, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${basicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "grant_type=client_credentials"
          });
          
          if (!res.ok) {
            const data = await res.json();
            return { success: false, error: data.error_description || data.error || "Failed to retrieve PayPal OAuth token." };
          }
          return { success: true };
        }
        case "razorpay": {
          const rzp = new Razorpay({
            key_id: validatedCreds.keyId,
            key_secret: validatedCreds.keySecret
          });
          await rzp.orders.all({ count: 1 });
          return { success: true };
        }
        case "braintree": {
          const isProd = validatedCreds.environment === "production";
          const gateway = new braintree.BraintreeGateway({
            environment: isProd ? braintree.Environment.Production : braintree.Environment.Sandbox,
            merchantId: validatedCreds.merchantId,
            publicKey: validatedCreds.publicKey,
            privateKey: validatedCreds.privateKey
          });
          await gateway.clientToken.generate({});
          return { success: true };
        }
        case "authorizenet": {
          const isLive = validatedCreds.environment === "live";
          const url = isLive 
            ? "https://api.authorize.net/xml/v1/request.api" 
            : "https://apitest.authorize.net/xml/v1/request.api";
          
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              authenticateTestRequest: {
                merchantAuthentication: {
                  name: validatedCreds.apiLoginId,
                  transactionKey: validatedCreds.transactionKey
                }
              }
            })
          });

          if (!res.ok) {
            return { success: false, error: "Authorize.net request failed with HTTP " + res.status };
          }

          const responseText = await res.text();
          let data;
          try {
            // Authorize.net responds with a BOM UTF-8 JSON that can throw errors in parser
            const cleaned = responseText.replace(/^\uFEFF/, "");
            data = JSON.parse(cleaned);
          } catch (e) {
            return { success: false, error: "Invalid JSON response from Authorize.net" };
          }

          if (data?.messages?.resultCode !== "Ok") {
            const msg = data?.messages?.message?.[0]?.text || "Merchant authentication failed.";
            return { success: false, error: msg };
          }
          return { success: true };
        }
        default:
          return { success: false, error: `Connection test not implemented for ${provider}` };
      }
    } catch (err: any) {
      console.error(`[TEST_CONNECTION] error for ${provider}:`, err);
      return { success: false, error: err.message || "Connection test failed." };
    }
  }

  /**
   * Save dynamic credentials for a provider.
   */
  static async saveCredentials(adminId: string, provider: string, credentials: any): Promise<any> {
    const providerLower = provider.toLowerCase();
    
    // First, test the connection
    const testResult = await this.testConnection(providerLower, credentials);
    if (!testResult.success) {
      throw new Error(testResult.error || "Credentials verification failed. Unable to save.");
    }

    const encrypted = encrypt(JSON.stringify(credentials));

    const config = await prisma.paymentProviderConfig.upsert({
      where: {
        adminId_provider: {
          adminId,
          provider: providerLower
        }
      },
      update: {
        encryptedCredentials: encrypted,
        lastVerifiedAt: new Date()
      },
      create: {
        adminId,
        provider: providerLower,
        encryptedCredentials: encrypted,
        enabled: false,
        lastVerifiedAt: new Date()
      }
    });

    // Write audit log
    await prisma.integrationAuditLog.create({
      data: {
        gatewayName: providerLower,
        action: "SAVE_CREDENTIALS",
        status: "SUCCESS",
        details: `Saved and verified credentials for ${providerLower}`
      }
    });

    return config;
  }

  /**
   * Toggle enabled status of a provider gateway.
   */
  static async toggleProvider(adminId: string, provider: string, enabled: boolean): Promise<any> {
    const providerLower = provider.toLowerCase();
    
    const existing = await prisma.paymentProviderConfig.findUnique({
      where: {
        adminId_provider: {
          adminId,
          provider: providerLower
        }
      }
    });

    if (!existing) {
      throw new Error(`Configure credentials for ${provider} before enabling.`);
    }

    // Disable all other providers to ensure only one is active, or keep multi-gateway?
    // The requirement says: "Admin enables/disables the provider." So let's update this provider.
    const config = await prisma.paymentProviderConfig.update({
      where: {
        id: existing.id
      },
      data: {
        enabled
      }
    });

    // Write audit log
    await prisma.integrationAuditLog.create({
      data: {
        gatewayName: providerLower,
        action: "TOGGLE_PROVIDER",
        status: "SUCCESS",
        details: `${enabled ? "Enabled" : "Disabled"} provider ${providerLower}`
      }
    });

    return config;
  }

  /**
   * Get all provider configs for a user.
   */
  static async getProviders(adminId: string): Promise<any[]> {
    const configs = await prisma.paymentProviderConfig.findMany({
      where: { adminId }
    });

    return Object.keys(CREDENTIALS_SCHEMAS).map(providerName => {
      const config = configs.find(c => c.provider === providerName);
      
      let credentialFields: any = {};
      if (config) {
        try {
          const decrypted = JSON.parse(decrypt(config.encryptedCredentials));
          // Mask secret/sensitive keys
          Object.keys(decrypted).forEach(k => {
            const val = decrypted[k];
            if (k.toLowerCase().includes("secret") || k.toLowerCase().includes("key") || k.toLowerCase().includes("token")) {
              credentialFields[k] = val ? `••••••••••••••••${val.slice(-4 || 0)}` : "";
            } else {
              credentialFields[k] = val;
            }
          });
        } catch (e) {}
      }

      return {
        provider: providerName,
        name: providerName.toUpperCase(),
        enabled: config?.enabled || false,
        lastVerifiedAt: config?.lastVerifiedAt || null,
        configured: !!config,
        fields: PROVIDER_FIELDS[providerName],
        credentials: credentialFields
      };
    });
  }

  /**
   * Get a single decrypted credentials object if enabled.
   */
  static async getDecryptedConfig(provider: string): Promise<any | null> {
    const config = await prisma.paymentProviderConfig.findFirst({
      where: { provider: provider.toLowerCase(), enabled: true }
    });

    if (!config) return null;

    try {
      return JSON.parse(decrypt(config.encryptedCredentials));
    } catch (e) {
      console.error(`Failed to decrypt credentials for ${provider}:`, e);
      return null;
    }
  }

  /**
   * Get any active/enabled provider config.
   */
  static async getActiveProvider(): Promise<{ provider: string; credentials: any } | null> {
    const config = await prisma.paymentProviderConfig.findFirst({
      where: { enabled: true }
    });

    if (!config) return null;

    try {
      const credentials = JSON.parse(decrypt(config.encryptedCredentials));
      return {
        provider: config.provider,
        credentials
      };
    } catch (e) {
      console.error("Failed to decrypt active config:", e);
      return null;
    }
  }
}
