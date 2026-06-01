import Stripe from "stripe";
import { Client as SquareClient, Environment as SquareEnvironment } from "square";
import Razorpay from "razorpay";

// braintree has no @types package — declare it here
// eslint-disable-next-line @typescript-eslint/no-var-requires
const braintree = require("braintree");

export class ProvidersService {
  /**
   * Test live connection to a payment provider using provided credentials.
   * Does NOT save anything — used for both pre-save validation and standalone tests.
   */
  static async testConnection(
    provider: string,
    credentials: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    const p = provider.toLowerCase();

    try {
      switch (p) {
        case "stripe": {
          if (!credentials.secretKey?.trim()) {
            return { success: false, error: "Secret Key is required." };
          }
          const stripe = new Stripe(credentials.secretKey, { apiVersion: "2023-10-16" as any });
          await stripe.balance.retrieve();
          return { success: true };
        }

        case "square": {
          if (!credentials.accessToken?.trim() || !credentials.locationId?.trim()) {
            return { success: false, error: "Access Token and Location ID are required." };
          }
          const square = new SquareClient({
            accessToken: credentials.accessToken,
            environment: SquareEnvironment.Sandbox,
          });
          const response = await square.locationsApi.listLocations();
          const locations = response.result.locations || [];
          const exists = locations.some((loc: any) => loc.id === credentials.locationId);
          if (!exists) {
            return {
              success: false,
              error: `Location ID "${credentials.locationId}" not found on this Square account.`,
            };
          }
          return { success: true };
        }

        case "paypal": {
          if (!credentials.clientId?.trim() || !credentials.clientSecret?.trim()) {
            return { success: false, error: "Client ID and Client Secret are required." };
          }
          const isLive = credentials.environment === "live";
          const host = isLive ? "api-m.paypal.com" : "api-m.sandbox.paypal.com";
          const basicAuth = Buffer.from(
            `${credentials.clientId}:${credentials.clientSecret}`
          ).toString("base64");
          const res = await fetch(`https://${host}/v1/oauth2/token`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${basicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          });
          if (!res.ok) {
            const data: any = await res.json();
            return {
              success: false,
              error: data.error_description || data.error || "PayPal token request failed.",
            };
          }
          return { success: true };
        }

        case "razorpay": {
          if (!credentials.keyId?.trim() || !credentials.keySecret?.trim()) {
            return { success: false, error: "Key ID and Key Secret are required." };
          }
          const rzp = new Razorpay({
            key_id: credentials.keyId,
            key_secret: credentials.keySecret,
          });
          await rzp.orders.all({ count: 1 });
          return { success: true };
        }

        case "braintree": {
          if (!credentials.merchantId?.trim() || !credentials.publicKey?.trim() || !credentials.privateKey?.trim()) {
            return { success: false, error: "Merchant ID, Public Key, and Private Key are required." };
          }
          const isProd = credentials.environment === "production";
          const gateway = new braintree.BraintreeGateway({
            environment: isProd ? braintree.Environment.Production : braintree.Environment.Sandbox,
            merchantId: credentials.merchantId,
            publicKey: credentials.publicKey,
            privateKey: credentials.privateKey,
          });
          await gateway.clientToken.generate({});
          return { success: true };
        }

        case "authorizenet": {
          if (!credentials.apiLoginId?.trim() || !credentials.transactionKey?.trim()) {
            return { success: false, error: "API Login ID and Transaction Key are required." };
          }
          const isLive = credentials.environment === "live";
          const url = isLive
            ? "https://api.authorize.net/xml/v1/request.api"
            : "https://apitest.authorize.net/xml/v1/request.api";
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              authenticateTestRequest: {
                merchantAuthentication: {
                  name: credentials.apiLoginId,
                  transactionKey: credentials.transactionKey,
                },
              },
            }),
          });
          if (!res.ok) {
            return { success: false, error: `Authorize.net returned HTTP ${res.status}` };
          }
          const text = await res.text();
          let data: any;
          try {
            data = JSON.parse(text.replace(/^\uFEFF/, ""));
          } catch {
            return { success: false, error: "Invalid JSON response from Authorize.net" };
          }
          if (data?.messages?.resultCode !== "Ok") {
            const msg = data?.messages?.message?.[0]?.text || "Merchant authentication failed.";
            return { success: false, error: msg };
          }
          return { success: true };
        }

        default:
          return { success: false, error: `Connection test not implemented for provider: ${p}` };
      }
    } catch (err: any) {
      console.error(`[testConnection:${p}]`, err.message);
      return { success: false, error: err.message || "Connection test failed." };
    }
  }
}
