import { Request, Response, NextFunction } from 'express';
import { churchStorage } from './church-storage.js';
import type { AuthenticatedRequest } from './auth.js';

// Feature gating middleware
export const requireFeature = (feature: string, usageField?: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const churchId = req.churchId;
      
      if (!churchId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasAccess = await churchStorage.hasFeatureAccess(churchId, feature);
      
      if (!hasAccess) {
        const church = await churchStorage.getChurchById(churchId);
        const subscriptionTier = church?.subscriptionTier || 'trial';
        
        return res.status(403).json({ 
          error: 'Feature not available',
          message: `This feature requires a higher subscription tier. Current tier: ${subscriptionTier}`,
          feature,
          subscriptionTier,
          upgradeRequired: true
        });
      }

      // Check usage limits if specified
      if (usageField) {
        const currentUsage = await getCurrentUsage(churchId, usageField);
        const limitCheck = await churchStorage.checkFeatureLimit(churchId, usageField, currentUsage);
        
        if (!limitCheck.allowed) {
          return res.status(403).json({
            error: 'Usage limit exceeded',
            message: limitCheck.reason,
            currentUsage,
            limit: limitCheck.limit,
            upgradeRequired: true
          });
        }
      }

      next();
    } catch (error) {
      console.error('Feature gate middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Helper function to get current usage for various features
async function getCurrentUsage(churchId: string, usageType: string): Promise<number> {
  switch (usageType) {
    case 'members':
      return await churchStorage.getChurchMemberCount(churchId);
    
    case 'monthly_reports':
      // Get count of reports generated this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      // TODO: Implement report count tracking
      return 0; // Placeholder
    
    case 'email_notifications':
      // Get count of emails sent this month
      // TODO: Implement email tracking
      return 0; // Placeholder
    
    case 'sms_notifications':
      // Get count of SMS sent this month
      // TODO: Implement SMS tracking
      return 0; // Placeholder
    
    default:
      return 0;
  }
}

// Middleware to check trial status and warn users
export const checkTrialStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const churchId = req.churchId;
    
    if (!churchId) {
      return next();
    }

    const church = await churchStorage.getChurchById(churchId);
    if (!church) {
      return next();
    }

    const isTrialActive = await churchStorage.isTrialActive(churchId);
    const trialDaysRemaining = await churchStorage.getTrialDaysRemaining(churchId);

    // Add trial information to response headers for frontend to display warnings
    if (isTrialActive) {
      res.setHeader('X-Trial-Days-Remaining', trialDaysRemaining.toString());
      res.setHeader('X-Trial-Status', 'active');
      
      // Show warning when trial is expiring soon
      if (trialDaysRemaining <= 7) {
        res.setHeader('X-Trial-Warning', `Your trial expires in ${trialDaysRemaining} days`);
      }
    } else if (church.subscriptionTier === 'trial') {
      // Trial has expired but no subscription
      res.setHeader('X-Trial-Status', 'expired');
      res.setHeader('X-Trial-Warning', 'Your trial has expired. Please upgrade to continue using all features.');
    }

    next();
  } catch (error) {
    console.error('Trial status middleware error:', error);
    next();
  }
};

// Middleware to enforce member limits
export const checkMemberLimit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const churchId = req.churchId;
    
    if (!churchId) {
      return next();
    }

    const church = await churchStorage.getChurchById(churchId);
    if (!church) {
      return next();
    }

    const memberCount = await churchStorage.getChurchMemberCount(churchId);
    
    if (memberCount >= (church.maxMembers || 0)) {
      return res.status(403).json({
        error: 'Member limit reached',
        message: `You have reached your member limit of ${church.maxMembers || 0}. Please upgrade your subscription to add more members.`,
        currentCount: memberCount,
        limit: church.maxMembers || 0,
        upgradeRequired: true
      });
    }

    next();
  } catch (error) {
    console.error('Member limit middleware error:', error);
    next();
  }
};

// Helper function to get subscription tier information
export const getSubscriptionInfo = async (churchId: string) => {
  const church = await churchStorage.getChurchById(churchId);
  const subscription = await churchStorage.getChurchSubscription(churchId);
  const isTrialActive = await churchStorage.isTrialActive(churchId);
  const trialDaysRemaining = await churchStorage.getTrialDaysRemaining(churchId);
  const memberCount = await churchStorage.getChurchMemberCount(churchId);

  return {
    church,
    subscription,
    isTrialActive,
    trialDaysRemaining,
    memberCount,
    memberUsagePercent: church ? Math.round((memberCount / (church.maxMembers || 1)) * 100) : 0,
  };
};