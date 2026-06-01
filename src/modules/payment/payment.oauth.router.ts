import { Router } from 'express';
import { connectStripe } from './payment.oauth.controller';
import { authenticate, authorize } from '../../common/middlewares/auth.middleware';

const router = Router();

// Only admin users should be able to connect a Stripe account
router.get('/connect/stripe', authenticate, authorize('payments.connect'), connectStripe);

export default router;
