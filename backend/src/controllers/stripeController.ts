import { Request, Response } from 'express';
import Stripe from 'stripe';
import Organization from '../models/Organization';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { Entitlement } from '../models/hosting.index';
import type { PlanTier } from '../models/Entitlement';
import { AuthRequest } from '../middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    maxSites: 1,
    maxCollaborators: 1,
    storageGB: 0,
    monthlyVisitors: 0,
  },
};

/**
 * Create a Stripe Checkout Session for subscription.
 */
export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    const { plan, billingPeriod } = req.body;

    if (!plan) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
      return res.status(400).json({ message: 'Invalid billing period' });
    }

    const lookupKey = `${plan}_${billingPeriod}`;

    // Get the org
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Get or create Stripe customer
    let customerId = org.subscription?.stripeCustomerId;

    if (!customerId) {
      // Get user email for customer creation
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          orgId: org._id.toString(),
          userId: req.userId!,
        },
      });

      customerId = customer.id;

      // Save customer ID to org
      org.subscription = org.subscription || { status: 'active' };
      org.subscription.stripeCustomerId = customerId;
      await org.save();
    }

    // Get price by lookup key
    console.log(`Looking for price with lookup_key: ${lookupKey}`);
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      expand: ['data.product'],
    });
    console.log(`Found ${prices.data.length} prices for lookup_key: ${lookupKey}`);

    if (prices.data.length === 0) {
      // Try listing all active prices to debug
      const allPrices = await stripe.prices.list({ active: true, limit: 20 });
      console.log('All active prices lookup_keys:', allPrices.data.map(p => p.lookup_key));

      return res.status(400).json({
        message: `Price not found for plan: ${plan} (${billingPeriod}). Please ensure the price is configured in Stripe with lookup key: ${lookupKey}`
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: prices.data[0].id,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard/plans?canceled=true`,
      metadata: {
        orgId: org._id.toString(),
        plan,
        billingPeriod,
      },
    });

    await AuditLog.create({
      orgId: req.orgId,
      userId: req.userId,
      action: 'stripe:checkout_created',
      targetType: 'Organization',
      targetId: org._id,
      metadata: { plan, billingPeriod, sessionId: session.id },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Create a Stripe Billing Portal Session.
 */
export const createPortalSession = async (req: AuthRequest, res: Response) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const customerId = org.subscription?.stripeCustomerId;
    if (!customerId) {
      return res.status(400).json({ message: 'No Stripe customer found. Please subscribe to a plan first.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${frontendUrl}/dashboard/billing`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Create portal session error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Get subscription status for the org.
 */
export const getSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const customerId = org.subscription?.stripeCustomerId;
    let stripeSubscription = null;

    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0] as any;
        stripeSubscription = {
          id: sub.id,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          plan: sub.items.data[0]?.price?.lookup_key || null,
        };
      }
    }

    res.json({
      plan: org.plan,
      billingPeriod: org.billingPeriod,
      subscription: org.subscription,
      limits: org.limits,
      stripeSubscription,
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Handle Stripe webhooks.
 */
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && webhookSecret !== 'whsec_12345') {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // For development without webhook secret verification
      event = JSON.parse(req.body.toString()) as Stripe.Event;
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCanceled(subscription);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

/**
 * Handle checkout session completed.
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.orgId;
  const plan: 'free' = 'free';
  const billingPeriod = session.metadata?.billingPeriod as 'monthly' | 'yearly';

  if (!orgId) {
    console.error('No orgId in checkout session metadata');
    return;
  }

  const org = await Organization.findById(orgId);
  if (!org) {
    console.error('Organization not found:', orgId);
    return;
  }

  // Update org with subscription info
  org.plan = plan;
  org.billingPeriod = billingPeriod;
  org.subscription = {
    ...org.subscription,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
    status: 'active',
  };
  org.limits = PLAN_LIMITS[plan];

  await org.save();

  // Update hosting Entitlement
  await syncHostingEntitlement(
    orgId,
    plan,
    session.customer as string,
    session.subscription as string
  );

  console.log(`Checkout complete for org ${orgId}: ${plan} (${billingPeriod})`);
}

/**
 * Handle subscription update (created or updated).
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find org by customer ID
  const org = await Organization.findOne({ 'subscription.stripeCustomerId': customerId });
  if (!org) {
    console.error('Organization not found for customer:', customerId);
    return;
  }

  // Determine plan from price lookup key
  const priceId = subscription.items.data[0]?.price?.id;
  const plan: 'free' = 'free';
  let billingPeriod: 'monthly' | 'yearly' = 'monthly';

  if (priceId) {
    const price = await stripe.prices.retrieve(priceId);
    const lookupKey = price.lookup_key || '';
    if (lookupKey.includes('Yearly')) {
      billingPeriod = 'yearly';
    }
  }

  // Map Stripe status to our status
  let status: 'active' | 'cancelled' | 'past_due' | 'trialing' = 'active';
  if (subscription.status === 'canceled') {
    status = 'cancelled';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'trialing') {
    status = 'trialing';
  }

  org.plan = plan;
  org.billingPeriod = billingPeriod;
  const subAny = subscription as any;
  const periodEnd = subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : undefined;
  org.subscription = {
    ...org.subscription,
    stripeSubscriptionId: subscription.id,
    status,
    currentPeriodEnd: periodEnd,
  };
  org.limits = PLAN_LIMITS[plan];

  await org.save();

  // Sync hosting entitlement
  await syncHostingEntitlement(
    org._id.toString(),
    plan,
    customerId,
    subscription.id,
    periodEnd
  );

  console.log(`Subscription updated for org ${org._id}: ${plan} - ${status}`);
}

/**
 * Handle subscription canceled.
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const org = await Organization.findOne({ 'subscription.stripeCustomerId': customerId });
  if (!org) {
    console.error('Organization not found for customer:', customerId);
    return;
  }

  // Downgrade to free plan
  org.plan = 'free';
  org.subscription = {
    ...org.subscription,
    status: 'cancelled',
  };
  org.limits = PLAN_LIMITS.free;

  await org.save();

  // Downgrade hosting entitlement
  await downgradeHostingEntitlement(org._id.toString());

  console.log(`Subscription canceled for org ${org._id}`);
}

/**
 * Handle payment failed.
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const org = await Organization.findOne({ 'subscription.stripeCustomerId': customerId });
  if (!org) {
    console.error('Organization not found for customer:', customerId);
    return;
  }

  org.subscription = {
    ...org.subscription,
    status: 'past_due',
  };

  await org.save();

  console.log(`Payment failed for org ${org._id}`);
  // TODO: Send email notification to org owner
}

/**
 * Sync hosting Entitlement with Stripe subscription.
 * Maps org plans to hosting plan tiers.
 */
async function syncHostingEntitlement(
  orgId: string,
  _plan: PlanTier,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  currentPeriodEnd?: Date
): Promise<void> {
  try {
    const planTier: PlanTier = 'free';

    // Find or create entitlement
    let entitlement = await Entitlement.findOne({ orgId });

    if (!entitlement) {
      entitlement = new Entitlement({
        orgId,
        plan: planTier,
        stripeCustomerId,
        stripeSubscriptionId,
        currentPeriodEnd,
        subscriptionStatus: 'active',
        cancelAtPeriodEnd: false,
        isCustom: false,
      });
    } else {
      entitlement.plan = planTier;
      entitlement.stripeCustomerId = stripeCustomerId;
      entitlement.stripeSubscriptionId = stripeSubscriptionId;
      entitlement.subscriptionStatus = 'active';
      if (currentPeriodEnd) {
        entitlement.currentPeriodEnd = currentPeriodEnd;
      }
    }

    await entitlement.save();
    console.log(`Hosting entitlement synced for org ${orgId}: ${planTier}`);
  } catch (error) {
    console.error('Failed to sync hosting entitlement:', error);
  }
}

/**
 * Downgrade hosting Entitlement to free tier.
 */
async function downgradeHostingEntitlement(orgId: string): Promise<void> {
  try {
    const entitlement = await Entitlement.findOne({ orgId });
    if (entitlement) {
      entitlement.plan = 'free';
      entitlement.stripeSubscriptionId = undefined;
      entitlement.subscriptionStatus = 'canceled';
      await entitlement.save();
      console.log(`Hosting entitlement downgraded to free for org ${orgId}`);
    }
  } catch (error) {
    console.error('Failed to downgrade hosting entitlement:', error);
  }
}