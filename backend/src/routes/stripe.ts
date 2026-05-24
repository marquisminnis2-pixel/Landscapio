import { Router } from 'express';
import express from 'express';
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  handleWebhook,
} from '../controllers/stripeController';
import { authMiddleware } from '../middleware/auth';
import { resolveOrg } from '../middleware/resolveOrg';
import { authorize } from '../middleware/authorize';

const router = Router();

// Webhook endpoint - must use raw body parser (configured in server.ts)
// No auth required - verified by Stripe signature
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Authenticated routes - require org context and billing permission
router.post(
  '/:orgId/checkout',
  authMiddleware,
  resolveOrg,
  authorize('org:billing'),
  createCheckoutSession
);

router.post(
  '/:orgId/portal',
  authMiddleware,
  resolveOrg,
  authorize('org:billing'),
  createPortalSession
);

router.get(
  '/:orgId/subscription',
  authMiddleware,
  resolveOrg,
  authorize('org:billing'),
  getSubscriptionStatus
);

export default router;