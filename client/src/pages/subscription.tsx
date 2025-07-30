import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Crown,
  Zap,
  Shield,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SubscriptionStatus {
  church: {
    id: string;
    name: string;
    subscriptionTier: string;
    maxMembers: number;
    memberCount: number;
    memberUsagePercent: number;
    isTrialActive: boolean;
    trialDaysRemaining: number;
    trialEndDate: string;
  };
  subscription: {
    id: string;
    status: string;
    planId: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  planDetails: {
    priceId: string;
    maxMembers: number;
    features: string[];
    monthlyPrice: number;
  } | null;
  availablePlans: Array<{
    id: string;
    name: string;
    monthlyPrice: number;
    maxMembers: number;
    features: string[];
  }>;
}

const SubscriptionPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: subscriptionStatus, isLoading: statusLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      return await apiRequest('/api/subscriptions/status');
    },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      return await apiRequest('/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/subscription?success=true`,
          cancelUrl: `${window.location.origin}/subscription?canceled=true`,
        }),
      });
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
  });

  const createPortalMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/subscriptions/portal', {
        method: 'POST',
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });
    },
    onSuccess: (data) => {
      // Open billing portal in new tab
      window.open(data.url, '_blank');
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/subscriptions/cancel', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/subscriptions/reactivate', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!subscriptionStatus) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load subscription information</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { church, subscription, availablePlans } = subscriptionStatus;

  const handleSubscribe = (planId: string) => {
    createCheckoutMutation.mutate({ planId });
  };

  const handleManageBilling = () => {
    createPortalMutation.mutate();
  };

  const handleCancelSubscription = () => {
    if (confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the current billing period.')) {
      cancelSubscriptionMutation.mutate();
    }
  };

  const handleReactivateSubscription = () => {
    reactivateSubscriptionMutation.mutate();
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter': return <Users className="w-5 h-5" />;
      case 'growth': return <Zap className="w-5 h-5" />;
      case 'enterprise': return <Crown className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Subscription Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your church's subscription and billing settings
          </p>
        </div>

        {/* Current Status */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getPlanIcon(church.subscriptionTier)}
                {church.subscriptionTier === 'trial' ? 'Free Trial' : 
                 church.subscriptionTier.charAt(0).toUpperCase() + church.subscriptionTier.slice(1)}
              </CardTitle>
              <CardDescription>Current subscription status</CardDescription>
            </CardHeader>
            <CardContent>
              {church.isTrialActive ? (
                <div className="space-y-4">
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{church.trialDaysRemaining} days remaining</strong> in your free trial.
                      Trial ends on {formatDate(church.trialEndDate)}.
                    </AlertDescription>
                  </Alert>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Trial Progress</p>
                    <Progress value={((30 - church.trialDaysRemaining) / 30) * 100} className="w-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
                    <Badge variant={subscription?.status === 'active' ? 'default' : 'destructive'}>
                      {subscription?.status || 'No subscription'}
                    </Badge>
                  </div>
                  {subscription && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Next billing</span>
                        <span className="text-sm font-medium">
                          {formatDate(subscription.currentPeriodEnd)}
                        </span>
                      </div>
                      {subscription.cancelAtPeriodEnd && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Your subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member Usage</CardTitle>
              <CardDescription>Current member count and limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Members</span>
                  <span className="text-sm font-medium">
                    {church.memberCount} / {church.maxMembers === 999999 ? '∞' : church.maxMembers}
                  </span>
                </div>
                {church.maxMembers !== 999999 && (
                  <div>
                    <Progress value={church.memberUsagePercent} className="w-full" />
                    <p className="text-xs text-gray-500 mt-1">
                      {church.memberUsagePercent}% of limit used
                    </p>
                  </div>
                )}
                {church.memberUsagePercent > 90 && church.maxMembers !== 999999 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You're approaching your member limit. Consider upgrading to add more members.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Actions */}
        {subscription && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Manage Subscription</CardTitle>
              <CardDescription>Update your billing information and subscription settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={handleManageBilling}
                  disabled={createPortalMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {createPortalMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  Manage Billing
                  <ExternalLink className="w-4 h-4" />
                </Button>

                {subscription.cancelAtPeriodEnd ? (
                  <Button 
                    variant="outline"
                    onClick={handleReactivateSubscription}
                    disabled={reactivateSubscriptionMutation.isPending}
                  >
                    {reactivateSubscriptionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Reactivate Subscription
                  </Button>
                ) : (
                  <Button 
                    variant="destructive"
                    onClick={handleCancelSubscription}
                    disabled={cancelSubscriptionMutation.isPending}
                  >
                    {cancelSubscriptionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {subscription ? 'Upgrade or Change Plan' : 'Choose Your Plan'}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {availablePlans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative ${
                  plan.id === church.subscriptionTier && !church.isTrialActive 
                    ? 'border-indigo-500 ring-2 ring-indigo-200' 
                    : ''
                }`}
              >
                {plan.id === 'growth' && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-indigo-600">
                    Most Popular
                  </Badge>
                )}
                
                {plan.id === church.subscriptionTier && !church.isTrialActive && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600">
                    Current Plan
                  </Badge>
                )}

                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-center justify-center">
                    <span className="text-4xl font-bold">{formatPrice(plan.monthlyPrice)}</span>
                    <span className="text-gray-500 dark:text-gray-400">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">
                        {plan.maxMembers === 999999 ? 'Unlimited members' : `Up to ${plan.maxMembers} members`}
                      </span>
                    </li>
                    {plan.features.slice(0, 5).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm capitalize">
                          {feature.replace(/_/g, ' ')}
                        </span>
                      </li>
                    ))}
                    {plan.features.length > 5 && (
                      <li className="text-sm text-gray-500">
                        +{plan.features.length - 5} more features
                      </li>
                    )}
                  </ul>
                  
                  <Button 
                    className="w-full" 
                    variant={plan.id === 'growth' ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={
                      createCheckoutMutation.isPending || 
                      (plan.id === church.subscriptionTier && !church.isTrialActive)
                    }
                  >
                    {createCheckoutMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {church.isTrialActive 
                      ? 'Subscribe' 
                      : plan.id === church.subscriptionTier 
                        ? 'Current Plan' 
                        : 'Change Plan'
                    }
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;