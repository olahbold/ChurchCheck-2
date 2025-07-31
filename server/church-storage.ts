import { eq, and, sql } from 'drizzle-orm';
import { db } from './db.js';
import { 
  churches, 
  churchUsers, 
  subscriptions, 
  members,
  attendanceRecords,
  followUpRecords,
  visitors,
  type Church,
  type InsertChurch,
  type ChurchUser,
  type InsertChurchUser,
  type Subscription,
  type InsertSubscription
} from '../shared/schema.js';

export class ChurchStorage {
  
  // Church management
  async createChurch(churchData: InsertChurch): Promise<Church> {
    const [church] = await db.insert(churches).values(churchData).returning();
    return church;
  }

  async getChurchById(id: string): Promise<Church | null> {
    const [church] = await db.select().from(churches).where(eq(churches.id, id));
    return church || null;
  }

  async getChurchBySubdomain(subdomain: string): Promise<Church | null> {
    const [church] = await db.select().from(churches).where(eq(churches.subdomain, subdomain));
    return church || null;
  }

  async updateChurch(id: string, updates: Partial<InsertChurch>): Promise<Church | null> {
    const [church] = await db
      .update(churches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(churches.id, id))
      .returning();
    return church || null;
  }

  async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    const [existing] = await db.select().from(churches).where(eq(churches.subdomain, subdomain));
    return !existing;
  }

  // Church user management
  async createChurchUser(userData: InsertChurchUser): Promise<ChurchUser> {
    const [user] = await db.insert(churchUsers).values(userData).returning();
    return user;
  }

  async getChurchUserByEmail(email: string): Promise<ChurchUser | null> {
    const [user] = await db.select().from(churchUsers).where(eq(churchUsers.email, email));
    return user || null;
  }

  async getChurchUsers(churchId: string): Promise<ChurchUser[]> {
    return await db.select().from(churchUsers).where(eq(churchUsers.churchId, churchId));
  }

  async updateChurchUser(id: string, updates: Partial<InsertChurchUser>): Promise<ChurchUser | null> {
    const [user] = await db
      .update(churchUsers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(churchUsers.id, id))
      .returning();
    return user || null;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(churchUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(churchUsers.id, userId));
  }

  // Get church by ID (alias for getChurchById for consistency)
  async getChurch(id: string): Promise<Church | null> {
    return this.getChurchById(id);
  }

  // Update church branding
  async updateChurchBranding(churchId: string, brandingData: { logoUrl?: string; bannerUrl?: string; brandColor?: string }): Promise<Church | null> {
    const [church] = await db
      .update(churches)
      .set({ ...brandingData, updatedAt: new Date() })
      .where(eq(churches.id, churchId))
      .returning();
    return church || null;
  }

  async deleteChurchUser(id: string): Promise<boolean> {
    const result = await db.delete(churchUsers).where(eq(churchUsers.id, id));
    return result.count > 0;
  }

  // Subscription management
  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(subscriptionData).returning();
    return subscription;
  }

  async getChurchSubscription(churchId: string): Promise<Subscription | null> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.churchId, churchId));
    return subscription || null;
  }

  async updateSubscription(churchId: string, updates: Partial<InsertSubscription>): Promise<Subscription | null> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.churchId, churchId))
      .returning();
    return subscription || null;
  }

  // Church statistics and limits
  async getChurchMemberCount(churchId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(members)
      .where(eq(members.churchId, churchId));
    return result.count;
  }

  async canAddMember(churchId: string): Promise<{ allowed: boolean; reason?: string }> {
    const church = await this.getChurchById(churchId);
    if (!church) {
      return { allowed: false, reason: 'Church not found' };
    }

    const memberCount = await this.getChurchMemberCount(churchId);
    
    // Check subscription limits
    if (memberCount >= church.maxMembers) {
      return { 
        allowed: false, 
        reason: `Member limit reached (${church.maxMembers}). Upgrade your subscription to add more members.` 
      };
    }

    return { allowed: true };
  }

  // Trial management
  async isTrialActive(churchId: string): Promise<boolean> {
    const church = await this.getChurchById(churchId);
    if (!church) return false;

    if (church.subscriptionTier !== 'trial') return false;

    const now = new Date();
    return church.trialEndDate ? now < church.trialEndDate : false;
  }

  async getTrialDaysRemaining(churchId: string): Promise<number> {
    const church = await this.getChurchById(churchId);
    if (!church || church.subscriptionTier !== 'trial' || !church.trialEndDate) {
      return 0;
    }

    const now = new Date();
    const diffTime = church.trialEndDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  // Feature gating based on subscription tier
  async hasFeatureAccess(churchId: string, feature: string): Promise<boolean> {
    const church = await this.getChurchById(churchId);
    if (!church) return false;

    const { subscriptionTier } = church;
    const isTrialActive = await this.isTrialActive(churchId);

    // During trial, all features are available
    if (isTrialActive) return true;

    // Feature matrix based on subscription tiers
    const featureMatrix: Record<string, string[]> = {
      // Basic features available to all paid tiers
      'basic_checkin': ['starter', 'growth', 'enterprise'],
      'member_management': ['starter', 'growth', 'enterprise'],
      'basic_reports': ['starter', 'growth', 'enterprise'],
      
      // Growth tier features
      'biometric_checkin': ['growth', 'enterprise'],
      'family_checkin': ['growth', 'enterprise'],
      'visitor_management': ['growth', 'enterprise'],
      'history_tracking': ['growth', 'enterprise'],
      'follow_up_queue': ['growth', 'enterprise'],
      'email_notifications': ['growth', 'enterprise'],
      
      // Enterprise-only features
      'full_analytics': ['enterprise'],
      'sms_notifications': ['enterprise'],
      'bulk_upload': ['enterprise'],
      'advanced_roles': ['enterprise'],
      'multi_location': ['enterprise'],
      'api_access': ['enterprise'],
      'custom_branding': ['enterprise'],
    };

    const allowedTiers = featureMatrix[feature] || [];
    return allowedTiers.includes(subscriptionTier);
  }

  // Enhanced feature access with usage limits
  async checkFeatureLimit(churchId: string, feature: string, currentUsage: number): Promise<{
    allowed: boolean;
    reason?: string;
    limit?: number;
  }> {
    const hasAccess = await this.hasFeatureAccess(churchId, feature);
    if (!hasAccess) {
      return { 
        allowed: false, 
        reason: 'Feature not available in current subscription tier' 
      };
    }

    const church = await this.getChurchById(churchId);
    if (!church) {
      return { allowed: false, reason: 'Church not found' };
    }

    // Define usage limits per tier
    const usageLimits: Record<string, Record<string, number>> = {
      starter: {
        members: 100,
        monthly_reports: 5,
        email_notifications: 100,
      },
      growth: {
        members: 999999,
        monthly_reports: 50,
        email_notifications: 1000,
        sms_notifications: 0, // Not available
      },
      enterprise: {
        members: 999999,
        monthly_reports: 999999,
        email_notifications: 999999,
        sms_notifications: 999999,
      },
    };

    const tierLimits = usageLimits[church.subscriptionTier] || {};
    const limit = tierLimits[feature];

    if (limit !== undefined && currentUsage >= limit) {
      return {
        allowed: false,
        reason: `Usage limit reached (${limit}). Upgrade your subscription for higher limits.`,
        limit,
      };
    }

    return { allowed: true, limit };
  }

  // Church onboarding and setup
  async completeChurchSetup(churchId: string, setupData: {
    logoUrl?: string;
    brandColor?: string;
    subdomain?: string;
  }): Promise<Church | null> {
    return await this.updateChurch(churchId, setupData);
  }

  // Cleanup and data management
  async deleteChurchData(churchId: string): Promise<void> {
    // Delete in order to respect foreign key constraints
    await db.delete(attendanceRecords).where(eq(attendanceRecords.churchId, churchId));
    await db.delete(followUpRecords).where(eq(followUpRecords.churchId, churchId));
    await db.delete(visitors).where(eq(visitors.churchId, churchId));
    await db.delete(members).where(eq(members.churchId, churchId));
    await db.delete(subscriptions).where(eq(subscriptions.churchId, churchId));
    await db.delete(churchUsers).where(eq(churchUsers.churchId, churchId));
    await db.delete(churches).where(eq(churches.id, churchId));
  }
}

export const churchStorage = new ChurchStorage();