import { Router } from 'express';
import express from 'express';
import { z } from 'zod';
import { stripeService, SUBSCRIPTION_PLANS } from './stripe-service.js';
import { churchStorage } from './church-storage.js';
import { 
  authenticateToken, 
  requireRole, 
  type AuthenticatedRequest 
} from './auth.js';

const router = Router();

// Create checkout session for subscription
const createCheckoutSchema = z.object({
  planId: z.enum(['starter', 'growth', 'enterprise']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

router.post('/checkout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { planId, successUrl, cancelUrl } = createCheckoutSchema.parse(req.body);
    const churchId = req.churchId!;

    // Check if church already has an active subscription
    const existingSubscription = await churchStorage.getChurchSubscription(churchId);
    if (existingSubscription && existingSubscription.status === 'active') {
      return res.status(400).json({ 
        error: 'Church already has an active subscription. Use billing portal to make changes.' 
      });
    }

    const session = await stripeService.createCheckoutSession(
      churchId,
      planId,
      successUrl,
      cancelUrl
    );

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create billing portal session
const portalSchema = z.object({
  returnUrl: z.string().url(),
});

router.post('/portal', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { returnUrl } = portalSchema.parse(req.body);
    const churchId = req.churchId!;

    const session = await stripeService.createPortalSession(churchId, returnUrl);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create portal session error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// Get subscription status and details
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const churchId = req.churchId!;
    const church = await churchStorage.getChurchById(churchId);
    const subscription = await churchStorage.getChurchSubscription(churchId);

    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const isTrialActive = await churchStorage.isTrialActive(churchId);
    const trialDaysRemaining = await churchStorage.getTrialDaysRemaining(churchId);
    const memberCount = await churchStorage.getChurchMemberCount(churchId);

    const planDetails = SUBSCRIPTION_PLANS[church.subscriptionTier as keyof typeof SUBSCRIPTION_PLANS] || null;

    res.json({
      church: {
        id: church.id,
        name: church.name,
        subscriptionTier: church.subscriptionTier,
        maxMembers: church.maxMembers,
        memberCount,
        memberUsagePercent: Math.round((memberCount / church.maxMembers) * 100),
        isTrialActive,
        trialDaysRemaining,
        trialEndDate: church.trialEndDate,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        planId: subscription.planId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : null,
      planDetails,
      availablePlans: Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
        id: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        monthlyPrice: plan.monthlyPrice,
        maxMembers: plan.maxMembers,
        features: plan.features,
      })),
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Webhook endpoint for Stripe events (requires raw body parsing)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const event = stripeService.verifyWebhookSignature(payload, signature);

    console.log('Stripe webhook received:', event.type);

    switch (event.type) {
      case 'customer.subscription.created':
        await stripeService.handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await stripeService.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await stripeService.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        console.log('Payment succeeded for subscription:', event.data.object.subscription);
        break;

      case 'invoice.payment_failed':
        console.log('Payment failed for subscription:', event.data.object.subscription);
        // TODO: Send notification to church admin
        break;

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// Manually trigger subscription upgrade/downgrade
const changePlanSchema = z.object({
  newPlanId: z.enum(['starter', 'growth', 'enterprise']),
});

router.post('/change-plan', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { newPlanId } = changePlanSchema.parse(req.body);
    const churchId = req.churchId!;

    const subscription = await churchStorage.getChurchSubscription(churchId);
    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const updatedSubscription = await stripeService.changeSubscriptionPlan(
      subscription.stripeSubscriptionId,
      newPlanId
    );

    // Update local records
    await stripeService.handleSubscriptionUpdated(updatedSubscription);

    res.json({ 
      success: true, 
      message: `Subscription changed to ${newPlanId}`,
      subscription: updatedSubscription 
    });
  } catch (error) {
    console.error('Change plan error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Failed to change subscription plan' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const churchId = req.churchId!;

    const subscription = await churchStorage.getChurchSubscription(churchId);
    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const canceledSubscription = await stripeService.cancelSubscription(subscription.stripeSubscriptionId);

    // Update local records
    await churchStorage.updateSubscription(churchId, {
      cancelAtPeriodEnd: true,
    });

    res.json({ 
      success: true, 
      message: 'Subscription will be canceled at the end of the current period',
      subscription: canceledSubscription 
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
router.post('/reactivate', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const churchId = req.churchId!;

    const subscription = await churchStorage.getChurchSubscription(churchId);
    if (!subscription?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const reactivatedSubscription = await stripeService.reactivateSubscription(subscription.stripeSubscriptionId);

    // Update local records
    await churchStorage.updateSubscription(churchId, {
      cancelAtPeriodEnd: false,
    });

    res.json({ 
      success: true, 
      message: 'Subscription reactivated',
      subscription: reactivatedSubscription 
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

export default router;