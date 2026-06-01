import { Request, Response } from "express";
import { prisma } from "../../common/lib/prisma";
import { PaymentService } from "./payment.service";
import { PaymentProviderFactory } from "./providers/factory";
import { encrypt, decrypt } from "../../common/utils/encryption";

const SUPPORTED_GATEWAYS = [
  { name: "Stripe", value: "stripe", authType: "oauth" },
  { name: "Square", value: "square", authType: "oauth" },
  { name: "PayPal", value: "paypal", authType: "oauth" },
  { name: "Razorpay", value: "razorpay", authType: "credentials" },
  { name: "Braintree", value: "braintree", authType: "credentials" },
  { name: "Authorize.net", value: "authorizenet", authType: "credentials" }
];

export const getActiveKey = async (req: Request, res: Response) => {
  try {
    const data = await PaymentService.getActiveGatewayForCheckout();
    res.status(200).json({ success: true, ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getIntegrations = async (req: any, res: Response) => {
  try {
    const connected = await prisma.paymentIntegration.findMany({
      where: { userId: req.user.id }
    });

    const integrations = SUPPORTED_GATEWAYS.map(gateway => {
      const dbRecord = connected.find(c => c.gatewayName === gateway.value);
      return {
        id: dbRecord?.id || null,
        name: gateway.name,
        value: gateway.value,
        authType: gateway.authType,
        status: dbRecord?.status || "DISCONNECTED",
        webhookStatus: dbRecord?.webhookStatus || "INACTIVE",
        lastSyncAt: dbRecord?.lastSyncAt || null,
        merchantId: dbRecord?.merchantId || null
      };
    });

    res.status(200).json({ success: true, integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const connectCredentials = async (req: any, res: Response) => {
  try {
    const { gatewayName, credentials } = req.body;
    if (!gatewayName || !credentials) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    const provider = PaymentProviderFactory.getProvider(gatewayName);
    
    // Test the credentials first
    const isValid = await provider.testConnection(credentials);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid credentials. Connection test failed." });
    }

    // Connect
    const integration = await provider.connect(req.user.id, credentials);
    
    // Register audit log
    await prisma.integrationAuditLog.create({
      data: {
        gatewayName,
        action: "CONNECT",
        status: "SUCCESS",
        details: `Successfully connected API-key credentials for ${gatewayName}`
      }
    });

    // Auto-setup webhook
    const webhookUrl = `${process.env.FRONTEND_URL || "http://localhost:8181"}/api/payments/webhook/${gatewayName}`;
    const webhookSecret = await provider.createWebhook(integration.id, webhookUrl);
    
    await prisma.paymentIntegration.update({
      where: { id: integration.id },
      data: { 
        webhookStatus: "ACTIVE",
        accessToken: encrypt(webhookSecret) // Store webhook secret securely in accessToken field
      }
    });

    res.status(200).json({ success: true, message: `${gatewayName} connected successfully.`, integration });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const disconnectGateway = async (req: any, res: Response) => {
  try {
    const { gatewayId } = req.body;
    if (!gatewayId) {
      return res.status(400).json({ success: false, message: "Missing gatewayId" });
    }

    const integration = await prisma.paymentIntegration.findUnique({
      where: { id: gatewayId }
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: "Integration not found" });
    }

    const provider = PaymentProviderFactory.getProvider(integration.gatewayName);
    await provider.disconnect(gatewayId);

    // Register audit log
    await prisma.integrationAuditLog.create({
      data: {
        gatewayName: integration.gatewayName,
        action: "DISCONNECT",
        status: "SUCCESS",
        details: `Successfully disconnected gateway ${integration.gatewayName}`
      }
    });

    res.status(200).json({ success: true, message: `${integration.gatewayName} disconnected successfully.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const testConnection = async (req: Request, res: Response) => {
  try {
    const { gatewayName, credentials } = req.body;
    const provider = PaymentProviderFactory.getProvider(gatewayName);
    const success = await provider.testConnection(credentials);

    await prisma.integrationAuditLog.create({
      data: {
        gatewayName,
        action: "TEST_CONNECTION",
        status: success ? "SUCCESS" : "FAILED",
        details: success ? `Connection test succeeded for ${gatewayName}` : `Connection test failed for ${gatewayName}`
      }
    });

    res.status(200).json({ success, message: success ? "Connection successful!" : "Connection failed. Please check credentials." });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const syncTransactions = async (req: Request, res: Response) => {
  try {
    const { gatewayId } = req.body;
    const integration = await prisma.paymentIntegration.findUnique({
      where: { id: gatewayId }
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: "Integration not found" });
    }

    const provider = PaymentProviderFactory.getProvider(integration.gatewayName);
    const result = await provider.syncTransactions(gatewayId);

    await prisma.integrationAuditLog.create({
      data: {
        gatewayName: integration.gatewayName,
        action: "SYNC",
        status: "SUCCESS",
        details: `Synchronized ${result.count} transactions manually`
      }
    });

    res.status(200).json({ success: true, message: `Synchronization complete! Synced ${result.count} entries.`, result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.integrationAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// OAuth Redirect & Flow handlers
export const oauthConnect = async (req: any, res: Response) => {
  const gateway = req.params.gateway as string;
  const userId = req.user.id;

  // Sandbox client IDs for simulation
  const redirectUri = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/settings/payment-gateways?oauth=success&gateway=${gateway}`;

  // Simply redirect to a gorgeous simulated OAuth consent page
  // This allows zero-config local verification for any developer out-of-the-box!
  const oauthSimulationUrl = `/api/payments/oauth/consent/${gateway}?userId=${userId}&redirect=${encodeURIComponent(redirectUri)}`;
  
  res.redirect(oauthSimulationUrl);
};

export const oauthConsentPage = async (req: Request, res: Response) => {
  const gateway = req.params.gateway as string;
  const userId = req.query.userId as string;
  const redirect = req.query.redirect as string;

  // Renders a stunning glassmorphic developer-friendly OAuth simulation page!
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Connect ${gateway.toUpperCase()} - Sharcly Developer Sandbox</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Outfit', sans-serif;
          background: radial-gradient(circle at 10% 20%, rgb(4, 32, 19) 0%, rgb(2, 12, 8) 90%);
          color: #eff8ee;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          overflow: hidden;
        }
        .card {
          background: rgba(6, 45, 27, 0.4);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(239, 248, 238, 0.1);
          border-radius: 24px;
          padding: 40px;
          width: 450px;
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.5);
          text-align: center;
          animation: floatIn 0.8s ease-out;
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .logo-box {
          display: flex;
          justify-content: center;
          gap: 20px;
          align-items: center;
          margin-bottom: 30px;
        }
        .logo-circle {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .logo-sharcly {
          background: linear-gradient(135deg, #0ba360 0%, #3cba92 100%);
          color: white;
        }
        .logo-provider {
          background: white;
          color: #111;
        }
        h2 { font-size: 28px; margin: 0 0 10px 0; font-weight: 800; background: linear-gradient(to right, #eff8ee, #0ba360); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        p { font-size: 15px; color: rgba(239, 248, 238, 0.6); line-height: 1.6; margin: 0 0 30px 0; }
        .scope-list {
          text-align: left;
          background: rgba(0,0,0,0.2);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 30px;
          font-size: 13px;
        }
        .scope-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .scope-item:last-child { margin-bottom: 0; }
        .checkmark { color: #0ba360; font-weight: bold; }
        .btn {
          display: block;
          width: 100%;
          padding: 16px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          box-sizing: border-box;
        }
        .btn-connect {
          background: #0ba360;
          color: white;
          margin-bottom: 15px;
          box-shadow: 0 8px 25px rgba(11, 163, 96, 0.4);
        }
        .btn-connect:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(11, 163, 96, 0.6); }
        .btn-cancel {
          background: transparent;
          border: 1px solid rgba(239, 248, 238, 0.1);
          color: rgba(239, 248, 238, 0.6);
        }
        .btn-cancel:hover { background: rgba(239, 248, 238, 0.05); }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-box">
          <div class="logo-circle logo-sharcly">S</div>
          <div style="font-size: 20px; color: rgba(239, 248, 238, 0.3); font-weight: 300;">&harr;</div>
          <div class="logo-circle logo-provider" style="color: ${gateway === 'paypal' ? '#003087' : gateway === 'stripe' ? '#635bff' : '#222'}">
            ${gateway.slice(0,2).toUpperCase()}
          </div>
        </div>
        <h2>Connect ${gateway.toUpperCase()}</h2>
        <p>Grant Sharcly Sandbox access to read and write payment transactions, customer profiles, and subscription details.</p>
        
        <div class="scope-list">
          <div class="scope-item"><span class="checkmark">&check;</span> Full write access to process checkout card orders</div>
          <div class="scope-item"><span class="checkmark">&check;</span> Access transactions and customer historical metadata</div>
          <div class="scope-item"><span class="checkmark">&check;</span> Automatically install secure transaction webhooks</div>
        </div>

        <form action="/api/payments/oauth/callback/${gateway}" method="GET">
          <input type="hidden" name="code" value="mock_auth_code_${Math.random().toString(36).substring(2, 10)}" />
          <input type="hidden" name="userId" value="${userId}" />
          <input type="hidden" name="redirect" value="${redirect}" />
          <button type="submit" class="btn btn-connect">Authorize & Connect</button>
        </form>
        <button onclick="window.close()" class="btn btn-cancel" style="margin-top: 10px;">Cancel</button>
      </div>
    </body>
    </html>
  `;
  res.send(html);
};

export const oauthCallback = async (req: Request, res: Response) => {
  const gateway = req.params.gateway as string;
  const code = req.query.code as string;
  const userId = req.query.userId as string;
  const redirect = req.query.redirect as string;

  try {
    // Simulated token exchange flow
    const mockAccessToken = `oauth_access_token_${Math.random().toString(36).substring(2, 15)}`;
    const mockRefreshToken = `oauth_refresh_token_${Math.random().toString(36).substring(2, 15)}`;

    const provider = PaymentProviderFactory.getProvider(gateway);
    await provider.connect(userId as string, {
      authType: "oauth",
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      clientId: `client_id_${Math.random().toString(36).substring(2, 10)}`,
      clientSecret: `client_secret_${Math.random().toString(36).substring(2, 10)}`
    });

    // Write audit log
    await prisma.integrationAuditLog.create({
      data: {
        gatewayName: gateway,
        action: "CONNECT",
        status: "SUCCESS",
        details: `Successfully authorized and connected OAuth gateway for ${gateway}`
      }
    });

    // Auto setup webhook simulation
    const activeInt = await prisma.paymentIntegration.findFirst({
      where: { gatewayName: gateway, status: "CONNECTED" }
    });
    if (activeInt) {
      const webhookUrl = `${process.env.FRONTEND_URL || "http://localhost:8181"}/api/payments/webhook/${gateway}`;
      const webhookSecret = await provider.createWebhook(activeInt.id, webhookUrl);
      
      await prisma.paymentIntegration.update({
        where: { id: activeInt.id },
        data: { 
          webhookStatus: "ACTIVE",
          accessToken: encrypt(webhookSecret) // Store webhook secret securely in accessToken field
        }
      });
    }

    res.redirect(redirect as string);
  } catch (error: any) {
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/settings/payment-gateways?oauth=failed&error=${encodeURIComponent(error.message)}`);
  }
};
