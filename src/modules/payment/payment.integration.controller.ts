import { Request, Response } from 'express';
import { prisma } from '../../common/lib/prisma';

export const listIntegrations = async (req: Request, res: Response) => {
  try {
    const integrations = await prisma.paymentIntegration.findMany({
      select: {
        gatewayName: true,
        status: true,
        webhookStatus: true,
        lastSyncAt: true,
      },
    });
    return res.json({ success: true, integrations });
  } catch (err) {
    console.error('[PAYMENT INTEGRATIONS] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
