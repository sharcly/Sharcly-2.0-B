import { Request, Response } from 'express';
import { prisma } from '../../common/lib/prisma';

export const connectStripe = async (req: Request, res: Response) => {
  const code = req.query.token as string;
  if (!code) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const clientId = process.env.STRIPE_CLIENT_ID;
  const clientSecret = process.env.STRIPE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Stripe client credentials not configured' });
  }

  try {
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }).toString(),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error_description || 'OAuth failed' });
    }

    // Upsert the Stripe gateway record
    const gateway = await prisma.paymentGateway.upsert({
      where: { provider: 'stripe' },
      update: {
        secretKey: data.access_token,
        publishableKey: data.stripe_publishable_key,
        isActive: true,
      },
      create: {
        name: data.stripe_user_id || 'Stripe Connected',
        provider: 'stripe',
        secretKey: data.access_token,
        publishableKey: data.stripe_publishable_key,
        isActive: true,
        rotationLimit: 10,
        paymentCount: 0,
        totalPayments: 0,
      },
    });

    return res.json({
      success: true,
      gatewayId: gateway.id,
      publishableKey: gateway.publishableKey,
    });
  } catch (err: any) {
    console.error('[STRIPE OAuth] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
