import { eq, and, sql } from 'drizzle-orm';
import { db } from './db.js';
import { 
  churches, 
  churchUsers, 
  subscriptions, 
  superAdmins,
  members,
  attendanceRecords,
  followUpRecords,
  visitors,
  type Church,
  type InsertChurch,
  type ChurchUser,
  type InsertChurchUser,
  type SuperAdmin,
  type InsertSuperAdmin,
  type Subscription,
  type InsertSubscription
} from '../shared/schema.js';

export class ChurchStorage {
  deleteChurchById(id: string) {
    throw new Error('Method not implemented.');
  }
  
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

  // Super Admin management
  // async createSuperAdmin(adminData: InsertSuperAdmin): Promise<SuperAdmin> {
  //   const [admin] = await db.insert(superAdmins).values(adminData).returning();
  //   return admin;
  // }

const bcrypt = require('bcrypt');

async function createSuperAdmin(adminData: InsertSuperAdmin): Promise<SuperAdmin> {
  // Hash the password before storing it
  const hashedPassword = await bcrypt.hash(adminData.password, 10);

  // Insert the super admin into the database with the hashed password
  const [admin] = await db
    .insert(superAdmins)
    .values({
      ...adminData,
      passwordHash: hashedPassword, // Store the hashed password
      email: adminData.email.toLowerCase().trim(), // Normalize email
    })
    .returning();

  return admin;
}

async anySuperAdminExists(): Promise<boolean> {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(superAdmins);
    return Number(row?.count ?? 0) > 0;
  }

  // in ChurchStorage.getSuperAdminByEmail
async getSuperAdminByEmail(email: string): Promise<SuperAdmin | null> {
  const normalized = email.toLowerCase().trim();
  const [admin] = await db
    .select()
    .from(superAdmins)
    .where(sql`LOWER(${superAdmins.email}) = ${normalized}`)
    .limit(1);
  return admin || null;
}



  async getSuperAdminById(id: string): Promise<SuperAdmin | null> {
    const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.id, id));
    return admin || null;
  }

  async getAllSuperAdmins(): Promise<Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  }>> {
    const result = await db
      .select({
        id: superAdmins.id,
        email: superAdmins.email,
        firstName: superAdmins.firstName,
        lastName: superAdmins.lastName,
        role: superAdmins.role,
        isActive: superAdmins.isActive,
        lastLoginAt: superAdmins.lastLoginAt,
        createdAt: superAdmins.createdAt
      })
      .from(superAdmins)
      .orderBy(superAdmins.createdAt);
    
    return result.map(admin => ({
      ...admin,
      isActive: admin.isActive ?? false,
      lastLoginAt: admin.lastLoginAt ? admin.lastLoginAt.toISOString() : null,
      createdAt: admin.createdAt.toISOString()
    }));
  }

  async updateSuperAdminLastLogin(adminId: string): Promise<void> {
    await db
      .update(superAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(superAdmins.id, adminId));
  }

  // Platform management methods
  async getAllChurches(): Promise<Church[]> {
    return await db.select().from(churches).orderBy(churches.createdAt);
  }

  async getChurchStats(churchId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    totalAttendance: number;
    subscriptionTier: string;
  }> {
    const church = await this.getChurchById(churchId);
    if (!church) {
      throw new Error('Church not found');
    }

    const [memberStats] = await db
      .select({
        totalMembers: sql<number>`count(*)`,
        activeMembers: sql<number>`count(*) filter (where ${members.isCurrentMember} = true)`,
      })
      .from(members)
      .where(eq(members.churchId, churchId));

    const [attendanceStats] = await db
      .select({
        totalAttendance: sql<number>`count(*)`,
      })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.churchId, churchId));

    return {
      totalMembers: memberStats.totalMembers,
      activeMembers: memberStats.activeMembers,
      totalAttendance: attendanceStats.totalAttendance,
      subscriptionTier: church.subscriptionTier,
    };
  }

  async getPlatformStats(): Promise<{
    totalChurches: number;
    totalMembers: number;
    totalAttendance: number;
    activeChurches: number;
  }> {
    const [churchStats] = await db
      .select({
        totalChurches: sql<number>`count(*)`,
      })
      .from(churches);

    const [memberStats] = await db
      .select({
        totalMembers: sql<number>`count(*)`,
      })
      .from(members);

    const [attendanceStats] = await db
      .select({
        totalAttendance: sql<number>`count(*)`,
      })
      .from(attendanceRecords);

    // Active churches = churches with activity in last 30 days
    const [activeStats] = await db
      .select({
        activeChurches: sql<number>`count(distinct ${attendanceRecords.churchId})`,
      })
      .from(attendanceRecords)
      .where(sql`${attendanceRecords.checkInTime} >= NOW() - INTERVAL '30 days'`);

    return {
      totalChurches: churchStats.totalChurches,
      totalMembers: memberStats.totalMembers,
      totalAttendance: attendanceStats.totalAttendance,
      activeChurches: activeStats.activeChurches,
    };
  }

  // Get church by ID (alias for getChurchById for consistency)
  async getChurch(id: string): Promise<Church | null> {
    return this.getChurchById(id);
  }

  // Update church branding
  async updateChurchBranding(churchId: string, brandingData: { logoUrl?: string; bannerUrl?: string; brandColor?: string }): Promise<Church | null> {
    // Convert empty strings to null for database storage
    const processedData: any = { updatedAt: new Date() };
    if (brandingData.logoUrl !== undefined) {
      processedData.logoUrl = brandingData.logoUrl === "" ? null : brandingData.logoUrl;
    }
    if (brandingData.bannerUrl !== undefined) {
      processedData.bannerUrl = brandingData.bannerUrl === "" ? null : brandingData.bannerUrl;
    }
    if (brandingData.brandColor !== undefined) {
      processedData.brandColor = brandingData.brandColor === "" ? null : brandingData.brandColor;
    }
    
    const [church] = await db
      .update(churches)
      .set(processedData)
      .where(eq(churches.id, churchId))
      .returning();
    return church || null;
  }

  async deleteChurchUser(id: string): Promise<boolean> {
    const result = await db.delete(churchUsers).where(eq(churchUsers.id, id));
    return (result.rowCount ?? 0) > 0;
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
    if (church.maxMembers && memberCount >= church.maxMembers) {
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