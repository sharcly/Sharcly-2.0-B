import { Request, Response } from "express";
import { prisma } from "../../common/lib/prisma";
import { encrypt, decrypt } from "../../common/utils/encryption";
import { PaymentService } from "./payment.service";
import { ProvidersService } from "./providers.service";

// Provider required field definitions
const PROVIDER_FIELDS: Record<string, string[]> = {
  stripe:       ["publishableKey", "secretKey"],
  square:       ["applicationId", "accessToken", "locationId"],
  paypal:       ["clientId", "clientSecret", "environment"],
  razorpay:     ["keyId", "keySecret"],
  braintree:    ["merchantId", "publicKey", "privateKey"],
  authorizenet: ["apiLoginId", "transactionKey"],
};

const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_FIELDS);

/**
 * GET /api/payments/gateways
 * List all configured payment gateways (credentials masked)
 */
export const listGateways = async (req: Request, res: Response) => {
  try {
    const gateways = await prisma.paymentProviderConfig.findMany({
      orderBy: { createdAt: "desc" },
    });

    const masked = gateways.map((g) => {
      let creds: Record<string, string> = {};
      try {
        const raw = JSON.parse(decrypt(g.encryptedCredentials));
        Object.keys(raw).forEach((k) => {
          const v: string = raw[k] || "";
          const isSecret =
            k.toLowerCase().includes("secret") ||
            k.toLowerCase().includes("key") ||
            k.toLowerCase().includes("token") ||
            k.toLowerCase().includes("private");
          creds[k] = isSecret && v ? `••••••••${v.slice(-4)}` : v;
        });
      } catch {}
      return {
        id: g.id,
        name: g.name,
        provider: g.provider,
        enabled: g.enabled,
        lastVerifiedAt: g.lastVerifiedAt,
        createdAt: g.createdAt,
        credentials: creds,
      };
    });

    res.json({ success: true, gateways: masked });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/payments/gateways
 * Add a new payment gateway — validates credentials live, then saves encrypted
 */
export const addGateway = async (req: Request, res: Response) => {
  try {
    const { name, provider, credentials } = req.body as {
      name: string;
      provider: string;
      credentials: Record<string, string>;
    };

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Gateway name is required." });
    }
    if (!SUPPORTED_PROVIDERS.includes(provider?.toLowerCase())) {
      return res
        .status(400)
        .json({ success: false, message: `Unsupported provider: ${provider}` });
    }

    const providerKey = provider.toLowerCase();
    const required = PROVIDER_FIELDS[providerKey];
    for (const field of required) {
      if (!credentials?.[field]?.trim()) {
        return res
          .status(400)
          .json({ success: false, message: `Missing required field: ${field}` });
      }
    }

    // Test the connection live before saving
    const test = await ProvidersService.testConnection(providerKey, credentials);
    if (!test.success) {
      return res.status(400).json({
        success: false,
        message: `Credential verification failed: ${test.error}`,
      });
    }

    const encrypted = encrypt(JSON.stringify(credentials));
    const gateway = await prisma.paymentProviderConfig.create({
      data: {
        name: name.trim(),
        provider: providerKey,
        encryptedCredentials: encrypted,
        enabled: true,
        lastVerifiedAt: new Date(),
      },
    });

    await prisma.integrationAuditLog.create({
      data: {
        gatewayName: providerKey,
        action: "ADD_GATEWAY",
        status: "SUCCESS",
        details: `Added gateway "${name}" for provider ${providerKey}`,
      },
    });

    res.status(201).json({
      success: true,
      message: `${providerKey.toUpperCase()} gateway "${name}" added successfully!`,
      gateway: { id: gateway.id, name: gateway.name, provider: gateway.provider, enabled: gateway.enabled },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/payments/gateways/:id
 * Remove a payment gateway
 */
export const deleteGateway = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.paymentProviderConfig.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Gateway not found." });
    }
    await prisma.paymentProviderConfig.delete({ where: { id } });
    res.json({ success: true, message: "Gateway removed successfully." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/payments/gateways/:id/toggle
 * Enable or disable a gateway
 */
export const toggleGateway = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { enabled } = req.body as { enabled: boolean };

    const gateway = await prisma.paymentProviderConfig.update({
      where: { id },
      data: { enabled },
    });

    await prisma.integrationAuditLog.create({
      data: {
        gatewayName: gateway.provider,
        action: "TOGGLE_GATEWAY",
        status: "SUCCESS",
        details: `Gateway "${gateway.name}" ${enabled ? "enabled" : "disabled"}`,
      },
    });

    res.json({
      success: true,
      message: `Gateway "${gateway.name}" ${enabled ? "enabled" : "disabled"}.`,
      gateway,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/payments/gateways/:id/test
 * Re-test an existing saved gateway
 */
export const testGateway = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.paymentProviderConfig.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Gateway not found." });
    }

    let creds: any = {};
    try {
      creds = JSON.parse(decrypt(existing.encryptedCredentials));
    } catch {
      return res.status(500).json({ success: false, message: "Failed to decrypt stored credentials." });
    }

    const result = await ProvidersService.testConnection(existing.provider, creds);

    // Update lastVerifiedAt if successful
    if (result.success) {
      await prisma.paymentProviderConfig.update({
        where: { id },
        data: { lastVerifiedAt: new Date() },
      });
    }

    await prisma.integrationAuditLog.create({
      data: {
        gatewayName: existing.provider,
        action: "TEST_GATEWAY",
        status: result.success ? "SUCCESS" : "FAILED",
        details: result.success
          ? `Connection test passed for "${existing.name}"`
          : `Connection test failed for "${existing.name}": ${result.error}`,
      },
    });

    if (result.success) {
      res.json({ success: true, message: "Connection test passed!" });
    } else {
      res.status(400).json({ success: false, message: result.error || "Connection test failed." });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/payments/gateways/test-credentials
 * Test credentials BEFORE saving (from the add-gateway form)
 */
export const testCredentials = async (req: Request, res: Response) => {
  try {
    const { provider, credentials } = req.body;
    if (!SUPPORTED_PROVIDERS.includes(provider?.toLowerCase())) {
      return res.status(400).json({ success: false, message: `Unsupported provider: ${provider}` });
    }
    const result = await ProvidersService.testConnection(provider.toLowerCase(), credentials);
    if (result.success) {
      res.json({ success: true, message: "Credentials verified successfully!" });
    } else {
      res.status(400).json({ success: false, message: result.error || "Verification failed." });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/payments/active-key
 * Used by checkout to resolve the active payment gateway public key
 */
export const getActiveKey = async (req: Request, res: Response) => {
  try {
    const data = await PaymentService.getActiveGatewayForCheckout();
    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/payments/audit-logs
 * Last 50 gateway activity logs for dashboard
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.integrationAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
