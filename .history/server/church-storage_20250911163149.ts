import { eq, sql } from 'drizzle-orm';
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
  type InsertSubscription,
} from '../shared/schema.js';
import bcrypt from 'bcryptjs';

/**
 * Runs the provided function inside a transaction when the driver supports it.
 * Falls back to sequential (non-atomic) execution on Neon HTTP (no transactions).
 */
async function withTxFallback<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
  try {
    // @ts-ignore drizzle type differs per driver
    return await db.transaction(async (tx) => fn(tx));
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('No transactions support in neon-http driver')) {
      // Fallback for Neon HTTP driver: run operations without a transaction
      return await fn(db as any);
    }
    throw err;
  }
}

export class ChurchStorage {
  // --------- Church management ---------

  async createChurch(churchData: InsertChurch): Promise<Church> {
    const [church] = await db.insert(churches).values(churchData).returning();
    return church;
  }

  async getChurchById(id: string): Promise<Church | null> {
    const [church] = await db.select().from(churches).where(eq(churches.id, id));
    return church || null;
  }

  /** Alias used by some routes (e.g., branding GET) */
  async getChurch(id: string): Promise<Church | null> {
    return this.getChurchById(id);
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

  // Removes the *entire* tenant (church + church admins + subscription + all data).
  // Does NOT touch superAdmins.
  async deleteChurchById(churchId: string): Promise<void> {
    await this.factoryResetTenant(churchId);
  }

  // --------- Church user (church-level admins) ---------

  async createChurchUser(userData: InsertChurchUser): Promise<ChurchUser> {
    const [user] = await db
      .insert(churchUsers)
      .values({ ...userData, email: userData.email.toLowerCase().trim() })
      .returning();
    return user;
  }

  async getChurchUserByEmail(email: string): Promise<ChurchUser | null> {
    const normalized = email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(churchUsers)
      .where(sql`LOWER(${churchUsers.email}) = ${normalized}`)
      .limit(1);
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

  async deleteChurchUser(id: string): Promise<boolean> {
    const result = await db.delete(churchUsers).where(eq(churchUsers.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(churchUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(churchUsers.id, userId));
  }

  // --------- Super Admin (global) ---------

  async createSuperAdmin(adminData: InsertSuperAdmin): Promise<SuperAdmin> {
    const alreadyHashed = adminData.passwordHash?.startsWith?.('$2b$');
    const passwordHash = alreadyHashed
      ? adminData.passwordHash
      : await bcrypt.hash(adminData.passwordHash, 10);

    const [admin] = await db
      .insert(superAdmins)
      .values({
        ...adminData,
        passwordHash,
        email: adminData.email.toLowerCase().trim(),
      })
      .returning();

    return admin;
  }

  async anySuperAdminExists(): Promise<boolean> {
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(superAdmins);
    return Number(row?.count ?? 0) > 0;
  }

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

  async getAllSuperAdmins(): Promise<
    Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      isActive: boolean;
      lastLoginAt: string | null;
      createdAt: string;
    }>
  > {
    const result = await db
      .select({
        id: superAdmins.id,
        email: superAdmins.email,
        firstName: superAdmins.firstName,
        lastName: superAdmins.lastName,
        role: superAdmins.role,
        isActive: superAdmins.isActive,
        lastLoginAt: superAdmins.lastLoginAt,
        createdAt: superAdmins.createdAt,
      })
      .from(superAdmins)
      .orderBy(superAdmins.createdAt);

    return result.map((admin) => ({
      ...admin,
      isActive: admin.isActive ?? false,
      lastLoginAt: admin.lastLoginAt ? admin.lastLoginAt.toISOString() : null,
      createdAt: admin.createdAt.toISOString(),
    }));
  }

  async updateSuperAdminLastLogin(adminId: string): Promise<void> {
    await db
      .update(superAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(superAdmins.id, adminId));
  }

  // --------- Platform / stats ---------

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
    if (!church) throw new Error('Church not found');

    const [memberStats] = await db
      .select({
        totalMembers: sql<number>`count(*)`,
        activeMembers: sql<number>`count(*) filter (where ${members.isCurrentMember} = true)`,
      })
      .from(members)
      .where(eq(members.churchId, churchId));

    const [attendanceStats] = await db
      .select({ totalAttendance: sql<number>`count(*)` })
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
    const [churchStats] = await db.select({ totalChurches: sql<number>`count(*)` }).from(churches);
    const [memberStats] = await db.select({ totalMembers: sql<number>`count(*)` }).from(members);
    const [attendanceStats] = await db
      .select({ totalAttendance: sql<number>`count(*)` })
      .from(attendanceRecords);

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

  // --------- Branding / subscription ---------

  async updateChurchBranding(
    churchId: string,
    brandingData: { logoUrl?: string; bannerUrl?: string; brandColor?: string }
  ): Promise<Church | null> {
    const patch: any = { updatedAt: new Date() };
    if (brandingData.logoUrl !== undefined) patch.logoUrl = brandingData.logoUrl || null;
    if (brandingData.bannerUrl !== undefined) patch.bannerUrl = brandingData.bannerUrl || null;
    if (brandingData.brandColor !== undefined) patch.brandColor = brandingData.brandColor || null;

    const [church] = await db.update(churches).set(patch).where(eq(churches.id, churchId)).returning();
    return church || null;
  }

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

  async updateSubscription(
    churchId: string,
    updates: Partial<InsertSubscription>
  ): Promise<Subscription | null> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.churchId, churchId))
      .returning();
    return subscription || null;
  }

  // --------- Limits & features (trial/starter/growth/enterprise) ---------

  async getChurchMemberCount(churchId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(members)
      .where(eq(members.churchId, churchId));
    return result.count;
  }

  async canAddMember(churchId: string): Promise<{ allowed: boolean; reason?: string }> {
    const church = await this.getChurchById(churchId);
    if (!church) return { allowed: false, reason: 'Church not found' };

    const memberCount = await this.getChurchMemberCount(churchId);

    if (church.maxMembers && memberCount >= church.maxMembers) {
      return {
        allowed: false,
        reason: `Member limit reached (${church.maxMembers}). Upgrade your subscription to add more members.`,
      };
    }

    return { allowed: true };
  }

  async isTrialActive(churchId: string): Promise<boolean> {
    const church = await this.getChurchById(churchId);
    if (!church) return false;
    if (church.subscriptionTier !== 'trial') return false;
    const now = new Date();
    return !!church.trialEndDate && now < church.trialEndDate;
  }

  async getTrialDaysRemaining(churchId: string): Promise<number> {
    const church = await this.getChurchById(churchId);
    if (!church || church.subscriptionTier !== 'trial' || !church.trialEndDate) return 0;
    const diff = church.trialEndDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  async hasFeatureAccess(churchId: string, feature: string): Promise<boolean> {
    const church = await this.getChurchById(churchId);
    if (!church) return false;

    // During trial, allow everything
    if (await this.isTrialActive(churchId)) return true;

    const tier = church.subscriptionTier;

    // Feature matrix per tier (adjust as you need)
    const featureMatrix: Record<string, string[]> = {
      // Basic across paid tiers
      basic_checkin: ['starter', 'growth', 'enterprise'],
      member_management: ['starter', 'growth', 'enterprise'],
      basic_reports: ['starter', 'growth', 'enterprise'],

      // Growth+
      biometric_checkin: ['growth', 'enterprise'],
      family_checkin: ['growth', 'enterprise'],
      visitor_management: ['growth', 'enterprise'],
      history_tracking: ['growth', 'enterprise'],
      follow_up_queue: ['growth', 'enterprise'],
      email_notifications: ['growth', 'enterprise'],

      // Enterprise only
      full_analytics: ['enterprise'],
      sms_notifications: ['enterprise'],
      bulk_upload: ['enterprise'],
      advanced_roles: ['enterprise'],
      multi_location: ['enterprise'],
      api_access: ['enterprise'],
      custom_branding: ['enterprise'],
    };

    const allowedTiers = featureMatrix[feature] || [];
    return allowedTiers.includes(tier);
  }

  async checkFeatureLimit(
    churchId: string,
    feature: string,
    currentUsage: number
  ): Promise<{ allowed: boolean; reason?: string; limit?: number }> {
    const hasAccess = await this.hasFeatureAccess(churchId, feature);
    if (!hasAccess) {
      return { allowed: false, reason: 'Feature not available in current subscription tier' };
    }

    const church = await this.getChurchById(churchId);
    if (!church) return { allowed: false, reason: 'Church not found' };

    // Per-tier usage limits (extend as needed)
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
      },
      enterprise: {
        members: 999999,
        monthly_reports: 999999,
        email_notifications: 999999,
        sms_notifications: 999999,
      },
    };

    const limit = usageLimits[church.subscriptionTier]?.[feature];
    if (limit !== undefined && currentUsage >= limit) {
      return {
        allowed: false,
        reason: `Usage limit reached (${limit}). Upgrade your subscription for higher limits.`,
        limit,
      };
    }

    return { allowed: true, limit };
  }

  async completeChurchSetup(
    churchId: string,
    setupData: { logoUrl?: string; brandColor?: string; subdomain?: string }
  ): Promise<Church | null> {
    return this.updateChurch(churchId, setupData);
  }

  // --------- Data cleanup (Clear vs Factory Reset) ---------
  //
  // Clear = remove tenant data (members/attendance/etc.) but KEEP church record and churchUsers (admins).
  // Factory Reset = remove everything for that church (church, its admins, subscription) — never touches superAdmins.

  // Legacy alias (if older code calls this expecting a *clear*, keep it as clear):
  async deleteChurchData(churchId: string): Promise<void> {
    await this.clearTenantData(churchId);
  }

  // Public: Clear tenant data ONLY (preserves church + churchUsers + superAdmins)
  async clearTenantData(churchId: string): Promise<void> {
    await withTxFallback(async (tx) => {
      await this._clearTenantData(tx, churchId);
    });
  }

  // Public: Factory reset (removes church, church admins, subscription, etc. — NEVER superAdmins)
  async factoryResetTenant(churchId: string): Promise<void> {
    await withTxFallback(async (tx) => {
      // Clear data first
      await this._clearTenantData(tx, churchId);
      // Then remove church-scoped admins, subscription, and church itself
      await tx.delete(churchUsers).where(eq(churchUsers.churchId, churchId));
      await tx.delete(subscriptions).where(eq(subscriptions.churchId, churchId));
      await tx.delete(churches).where(eq(churches.id, churchId));
    });
  }

  // Internal helper used by both clearTenantData and factoryResetTenant (keeps admins)
  private async _clearTenantData(tx: typeof db, churchId: string): Promise<void> {
    // Delete in FK-safe order; add any other tenant-scoped tables here
    await tx.delete(attendanceRecords).where(eq(attendanceRecords.churchId, churchId));
    await tx.delete(followUpRecords).where(eq(followUpRecords.churchId, churchId));
    await tx.delete(visitors).where(eq(visitors.churchId, churchId));
    await tx.delete(members).where(eq(members.churchId, churchId));

    // IMPORTANT:
    // - Do NOT delete churchUsers here (we keep admins for Clear All Data).
    // - NEVER touch superAdmins here or anywhere in tenant ops.
  }
}

export const churchStorage = new ChurchStorage();
