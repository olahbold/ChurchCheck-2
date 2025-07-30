import Stripe from 'stripe';
import { churchStorage } from './church-storage.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2024-12-18.acacia',
});

// Subscription tier configuration
export const SUBSCRIPTION_PLANS = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    maxMembers: 100,
    features: ['basic_checkin', 'member_management', 'basic_reports'],
    monthlyPrice: 1900, // $19.00 in cents
  },
  growth: {
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || 'price_growth',
    maxMembers: 999999,
    features: [
      'basic_checkin', 'member_management', 'basic_reports',
      'biometric_checkin', 'family_checkin', 'visitor_management',
      'history_tracking', 'follow_up_queue', 'email_notifications'
    ],
    monthlyPrice: 4900, // $49.00 in cents
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    maxMembers: 999999,
    features: [
      'basic_checkin', 'member_management', 'basic_reports',
      'biometric_checkin', 'family_checkin', 'visitor_management',
      'history_tracking', 'follow_up_queue', 'email_notifications',
      'full_analytics', 'sms_notifications', 'bulk_upload',
      'advanced_roles', 'multi_location', 'api_access', 'custom_branding'
    ],
    monthlyPrice: 9900, // $99.00 in cents
  },
};

export class StripeService {
  
  // Create a customer for the church
  async createCustomer(churchId: string, email: string, name: string): Promise<Stripe.Customer> {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        churchId,
      },
    });

    return customer;
  }

  // Create a checkout session for subscription
  async createCheckoutSession(
    churchId: string,
    planId: keyof typeof SUBSCRIPTION_PLANS,
    successUrl: string,
    cancelUrl: string,
    customerId?: string
  ): Promise<Stripe.Checkout.Session> {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    const church = await churchStorage.getChurchById(churchId);
    if (!church) {
      throw new Error('Church not found');
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        churchId,
        planId,
      },
      client_reference_id: churchId,
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else {
      sessionParams.customer_email = church.name; // Will need to get admin email
    }

    // Add trial period if church is currently on trial
    const isTrialActive = await churchStorage.isTrialActive(churchId);
    if (isTrialActive) {
      sessionParams.subscription_data = {
        trial_period_days: 0, // No additional trial since they already had one
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return session;
  }

  // Handle successful subscription creation
  async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const churchId = subscription.metadata?.churchId;
    if (!churchId) {
      throw new Error('No church ID in subscription metadata');
    }

    const planId = subscription.metadata?.planId as keyof typeof SUBSCRIPTION_PLANS;
    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      throw new Error('Invalid plan ID in subscription metadata');
    }

    const plan = SUBSCRIPTION_PLANS[planId];

    // Update church subscription tier and limits
    await churchStorage.updateChurch(churchId, {
      subscriptionTier: planId,
      maxMembers: plan.maxMembers,
      subscriptionStartDate: new Date(subscription.current_period_start * 1000),
    });

    // Create or update subscription record
    const existingSubscription = await churchStorage.getChurchSubscription(churchId);
    
    if (existingSubscription) {
      await churchStorage.updateSubscription(churchId, {
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        planId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    } else {
      await churchStorage.createSubscription({
        churchId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        planId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    }
  }

  // Handle subscription updates (upgrades/downgrades)
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const churchId = subscription.metadata?.churchId;
    if (!churchId) return;

    const planId = subscription.metadata?.planId as keyof typeof SUBSCRIPTION_PLANS;
    if (!planId || !SUBSCRIPTION_PLANS[planId]) return;

    const plan = SUBSCRIPTION_PLANS[planId];

    // Update church limits
    await churchStorage.updateChurch(churchId, {
      subscriptionTier: planId,
      maxMembers: plan.maxMembers,
    });

    // Update subscription record
    await churchStorage.updateSubscription(churchId, {
      status: subscription.status,
      planId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }

  // Handle subscription cancellation
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const churchId = subscription.metadata?.churchId;
    if (!churchId) return;

    // Downgrade to trial or basic tier
    await churchStorage.updateChurch(churchId, {
      subscriptionTier: 'trial',
      maxMembers: 100, // Basic limit
    });

    // Update subscription status
    await churchStorage.updateSubscription(churchId, {
      status: 'canceled',
    });
  }

  // Create a portal session for subscription management
  async createPortalSession(churchId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    const subscription = await churchStorage.getChurchSubscription(churchId);
    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    if (!stripeSubscription.customer) {
      throw new Error('No customer associated with subscription');
    }

    const customerId = typeof stripeSubscription.customer === 'string' 
      ? stripeSubscription.customer 
      : stripeSubscription.customer.id;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  }

  // Get subscription details
  async getSubscriptionDetails(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.retrieve(subscriptionId);
  }

  // Cancel subscription at period end
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  // Reactivate subscription
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  // Change subscription plan
  async changeSubscriptionPlan(
    subscriptionId: string, 
    newPlanId: keyof typeof SUBSCRIPTION_PLANS
  ): Promise<Stripe.Subscription> {
    const plan = SUBSCRIPTION_PLANS[newPlanId];
    if (!plan) {
      throw new Error(`Invalid plan: ${newPlanId}`);
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    return await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: plan.priceId,
        },
      ],
      metadata: {
        ...subscription.metadata,
        planId: newPlanId,
      },
    });
  }
}

export const stripeService = new StripeService();