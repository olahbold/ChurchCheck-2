import { 
  members, 
  attendanceRecords, 
  followUpRecords,
  adminUsers,
  reportConfigs,
  reportRuns,
  visitors,
  type Member, 
  type InsertMember, 
  type AttendanceRecord, 
  type InsertAttendanceRecord,
  type FollowUpRecord,
  type InsertFollowUpRecord,
  type AdminUser,
  type InsertAdminUser,
  type ReportConfig,
  type InsertReportConfig,
  type ReportRun,
  type InsertReportRun,
  type Visitor,
  type InsertVisitor,
  type User, 
  type InsertUser 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lte, count } from "drizzle-orm";

export interface IStorage {
  // Legacy user methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Member methods
  createMember(member: InsertMember): Promise<Member>;
  getMember(id: string): Promise<Member | undefined>;
  getMemberByFingerprint(fingerprintId: string): Promise<Member | undefined>;
  getAllMembers(): Promise<Member[]>;
  getMembersByParent(parentId: string): Promise<Member[]>;
  updateMember(id: string, member: Partial<InsertMember>): Promise<Member>;
  searchMembers(query: string, group?: string): Promise<Member[]>;

  // Attendance methods
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;
  getAttendanceForDate(date: string): Promise<AttendanceRecord[]>;
  getMemberAttendanceHistory(memberId: string, limit?: number): Promise<AttendanceRecord[]>;
  getAttendanceStats(date: string): Promise<{
    total: number;
    male: number;
    female: number;
    child: number;
    adolescent: number;
    adult: number;
  }>;

  // Follow-up methods
  updateFollowUpRecord(record: InsertFollowUpRecord): Promise<FollowUpRecord>;
  getMembersNeedingFollowUp(): Promise<(Member & { followUpRecord: FollowUpRecord })[]>;

  // Visitor methods
  createVisitor(visitor: InsertVisitor): Promise<Visitor>;
  getVisitor(id: string): Promise<Visitor | undefined>;
  getAllVisitors(): Promise<Visitor[]>;
  getVisitorsByStatus(status: string): Promise<Visitor[]>;
  updateVisitor(id: string, visitor: Partial<InsertVisitor>): Promise<Visitor>;
  updateConsecutiveAbsences(): Promise<void>;

  // Admin user methods
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  updateAdminUser(id: string, user: Partial<InsertAdminUser>): Promise<AdminUser>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  deleteAdminUser(id: string): Promise<void>;

  // Report methods
  createReportConfig(config: InsertReportConfig): Promise<ReportConfig>;
  getAllReportConfigs(): Promise<ReportConfig[]>;
  createReportRun(run: InsertReportRun): Promise<ReportRun>;
  getReportRuns(configId?: string): Promise<ReportRun[]>;
  
  // Analytics methods
  getWeeklyAttendanceSummary(startDate: string, endDate: string): Promise<any>;
  getMemberAttendanceLog(memberId?: string, startDate?: string, endDate?: string): Promise<any>;
  getMissedServicesReport(weeks: number): Promise<any>;
  getNewMembersReport(startDate: string, endDate: string): Promise<any>;
  getInactiveMembersReport(weeks: number): Promise<any>;
  getGroupAttendanceTrend(startDate: string, endDate: string): Promise<any>;
  getFamilyCheckInSummary(date: string): Promise<any>;
  getFollowUpActionTracker(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(members).where(eq(members.id, id));
    return user ? { id: user.id, username: user.firstName, password: '' } : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [member] = await db.select().from(members).where(eq(members.firstName, username));
    return member ? { id: member.id, username: member.firstName, password: '' } : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [member] = await db
      .insert(members)
      .values({
        firstName: insertUser.username,
        surname: 'Admin',
        gender: 'male',
        ageGroup: 'adult',
        phone: '000-000-0000',
        dateOfBirth: '1990-01-01',
        isCurrentMember: true,
      })
      .returning();
    return { id: member.id, username: member.firstName, password: '' };
  }

  // Member methods
  async createMember(member: InsertMember): Promise<Member> {
    const [newMember] = await db
      .insert(members)
      .values(member)
      .returning();
    return newMember;
  }

  async getMember(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member || undefined;
  }

  async getMemberByFingerprint(fingerprintId: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.fingerprintId, fingerprintId));
    return member || undefined;
  }

  async getAllMembers(): Promise<Member[]> {
    return await db.select().from(members).orderBy(members.firstName, members.surname);
  }

  async getMembersByParent(parentId: string): Promise<Member[]> {
    return await db.select().from(members).where(eq(members.parentId, parentId));
  }

  async updateMember(id: string, memberUpdate: Partial<InsertMember>): Promise<Member> {
    const [updatedMember] = await db
      .update(members)
      .set({
        ...memberUpdate,
        updatedAt: new Date(),
      })
      .where(eq(members.id, id))
      .returning();
    return updatedMember;
  }

  async searchMembers(query: string, group?: string): Promise<Member[]> {
    let conditions = [];
    
    if (query) {
      conditions.push(
        sql`${members.firstName} ILIKE ${`%${query}%`} OR ${members.surname} ILIKE ${`%${query}%`}`
      );
    }
    
    if (group && group !== 'all') {
      conditions.push(eq(members.gender, group));
    }
    
    const queryBuilder = db.select().from(members);
    
    if (conditions.length > 0) {
      return await queryBuilder
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(members.firstName, members.surname);
    }
    
    return await queryBuilder.orderBy(members.firstName, members.surname);
  }

  // Attendance methods
  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const [newRecord] = await db
      .insert(attendanceRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async deleteAttendanceRecord(recordId: string): Promise<boolean> {
    const result = await db
      .delete(attendanceRecords)
      .where(eq(attendanceRecords.id, recordId))
      .returning();
    return result.length > 0;
  }

  async getAttendanceForDate(date: string): Promise<any[]> {
    // Get both member and visitor attendance in a single query
    const memberAttendance = await db
      .select({
        id: attendanceRecords.id,
        memberId: attendanceRecords.memberId,
        visitorId: attendanceRecords.visitorId,
        attendanceDate: attendanceRecords.attendanceDate,
        checkInTime: attendanceRecords.checkInTime,
        checkInMethod: attendanceRecords.checkInMethod,
        isGuest: attendanceRecords.isGuest,
        visitorName: attendanceRecords.visitorName,
        visitorGender: attendanceRecords.visitorGender,
        visitorAgeGroup: attendanceRecords.visitorAgeGroup,
        member: {
          id: members.id,
          firstName: members.firstName,
          surname: members.surname,
          gender: members.gender,
          ageGroup: members.ageGroup,
          phone: members.phone,
          email: members.email,
        }
      })
      .from(attendanceRecords)
      .leftJoin(members, eq(attendanceRecords.memberId, members.id))
      .where(eq(attendanceRecords.attendanceDate, date))
      .orderBy(desc(attendanceRecords.checkInTime));

    // Transform the data to have a consistent structure for both members and visitors
    return memberAttendance.map(record => ({
      id: record.id,
      memberId: record.memberId,
      visitorId: record.visitorId,
      attendanceDate: record.attendanceDate,
      checkInTime: record.checkInTime,
      checkInMethod: record.checkInMethod,
      isGuest: record.isGuest,
      // Unified person data - use member data if it's a member, visitor data if it's a visitor
      member: record.member ? record.member : {
        id: record.visitorId,
        firstName: record.visitorName?.split(' ')[0] || 'Visitor',
        surname: record.visitorName?.split(' ').slice(1).join(' ') || '',
        gender: record.visitorGender,
        ageGroup: record.visitorAgeGroup,
        phone: null,
        email: null,
      },
      isVisitor: !record.memberId
    }));
  }

  async getMemberAttendanceHistory(memberId: string, limit = 10): Promise<AttendanceRecord[]> {
    return await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.memberId, memberId))
      .orderBy(desc(attendanceRecords.attendanceDate))
      .limit(limit);
  }

  async getAttendanceStats(date: string): Promise<{
    total: number;
    male: number;
    female: number;
    child: number;
    adolescent: number;
    adult: number;
  }> {
    // Query with a UNION approach to combine member and visitor stats
    const allAttendanceRecords = await db
      .select({
        gender: sql<string>`COALESCE(${members.gender}, ${attendanceRecords.visitorGender})`,
        ageGroup: sql<string>`COALESCE(${members.ageGroup}, ${attendanceRecords.visitorAgeGroup})`,
      })
      .from(attendanceRecords)
      .leftJoin(members, eq(attendanceRecords.memberId, members.id))
      .where(eq(attendanceRecords.attendanceDate, date));

    const result = {
      total: allAttendanceRecords.length,
      male: 0,
      female: 0,
      child: 0,
      adolescent: 0,
      adult: 0,
    };

    // Count demographics
    allAttendanceRecords.forEach(record => {
      // Gender stats
      if (record.gender === 'male') result.male++;
      if (record.gender === 'female') result.female++;
      
      // Age group stats
      if (record.ageGroup === 'child') result.child++;
      if (record.ageGroup === 'adolescent') result.adolescent++;
      if (record.ageGroup === 'adult') result.adult++;
    });

    return result;
  }

  // Follow-up methods
  async updateFollowUpRecord(record: InsertFollowUpRecord): Promise<FollowUpRecord> {
    const [existingRecord] = await db
      .select()
      .from(followUpRecords)
      .where(eq(followUpRecords.memberId, record.memberId));

    if (existingRecord) {
      const [updatedRecord] = await db
        .update(followUpRecords)
        .set(record)
        .where(eq(followUpRecords.memberId, record.memberId))
        .returning();
      return updatedRecord;
    } else {
      const [newRecord] = await db
        .insert(followUpRecords)
        .values(record)
        .returning();
      return newRecord;
    }
  }

  async getMembersNeedingFollowUp(): Promise<(Member & { followUpRecord: FollowUpRecord })[]> {
    const result = await db
      .select()
      .from(members)
      .innerJoin(followUpRecords, eq(members.id, followUpRecords.memberId))
      .where(eq(followUpRecords.needsFollowUp, true));

    return result.map(row => ({
      ...row.members,
      followUpRecord: row.follow_up_records,
    }));
  }

  async updateConsecutiveAbsences(): Promise<void> {
    // This would be called after each service to update absence counts
    // Implementation would check last attendance and update follow-up records
    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

    const membersWithoutRecentAttendance = await db
      .select({ id: members.id })
      .from(members)
      .leftJoin(
        attendanceRecords,
        and(
          eq(members.id, attendanceRecords.memberId),
          gte(attendanceRecords.attendanceDate, threeWeeksAgo.toISOString().split('T')[0])
        )
      )
      .where(sql`${attendanceRecords.id} IS NULL`);

    for (const member of membersWithoutRecentAttendance) {
      await this.updateFollowUpRecord({
        memberId: member.id,
        consecutiveAbsences: 3,
        needsFollowUp: true,
      });
    }
  }

  // Admin user methods
  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const [newUser] = await db
      .insert(adminUsers)
      .values({
        ...user,
        updatedAt: new Date(),
      })
      .returning();
    return newUser;
  }

  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return user || undefined;
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return user || undefined;
  }

  async updateAdminUser(id: string, userUpdate: Partial<InsertAdminUser>): Promise<AdminUser> {
    const [updatedUser] = await db
      .update(adminUsers)
      .set({
        ...userUpdate,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, id))
      .returning();
    return updatedUser;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers).orderBy(adminUsers.fullName);
  }

  async deleteAdminUser(id: string): Promise<void> {
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
  }

  // Report methods
  async createReportConfig(config: InsertReportConfig): Promise<ReportConfig> {
    const [newConfig] = await db
      .insert(reportConfigs)
      .values(config)
      .returning();
    return newConfig;
  }

  async getAllReportConfigs(): Promise<ReportConfig[]> {
    return await db.select().from(reportConfigs).orderBy(reportConfigs.title);
  }

  async createReportRun(run: InsertReportRun): Promise<ReportRun> {
    const [newRun] = await db
      .insert(reportRuns)
      .values(run)
      .returning();
    return newRun;
  }

  async getReportRuns(configId?: string): Promise<ReportRun[]> {
    if (configId) {
      return await db
        .select()
        .from(reportRuns)
        .where(eq(reportRuns.reportConfigId, configId))
        .orderBy(desc(reportRuns.generatedAt));
    }
    return await db
      .select()
      .from(reportRuns)
      .orderBy(desc(reportRuns.generatedAt));
  }

  // Analytics methods
  async getWeeklyAttendanceSummary(startDate: string, endDate: string): Promise<any> {
    const summary = await db
      .select({
        date: attendanceRecords.attendanceDate,
        group: members.gender,
        count: count(),
      })
      .from(attendanceRecords)
      .innerJoin(members, eq(attendanceRecords.memberId, members.id))
      .where(
        and(
          gte(attendanceRecords.attendanceDate, startDate),
          lte(attendanceRecords.attendanceDate, endDate)
        )
      )
      .groupBy(attendanceRecords.attendanceDate, members.gender)
      .orderBy(attendanceRecords.attendanceDate);

    return summary;
  }

  async getMemberAttendanceLog(memberId?: string, startDate?: string, endDate?: string): Promise<any> {
    let conditions = [];
    if (memberId) conditions.push(eq(attendanceRecords.memberId, memberId));
    if (startDate) conditions.push(gte(attendanceRecords.attendanceDate, startDate));
    if (endDate) conditions.push(lte(attendanceRecords.attendanceDate, endDate));

    const queryBuilder = db
      .select({
        memberId: attendanceRecords.memberId,
        memberName: sql`${members.firstName} || ' ' || ${members.surname}`,
        group: members.gender,
        attendanceDate: attendanceRecords.attendanceDate,
        checkInTime: attendanceRecords.checkInTime,
        checkInMethod: attendanceRecords.checkInMethod,
      })
      .from(attendanceRecords)
      .innerJoin(members, eq(attendanceRecords.memberId, members.id));

    if (conditions.length > 0) {
      return await queryBuilder
        .where(and(...conditions))
        .orderBy(desc(attendanceRecords.attendanceDate));
    }

    return await queryBuilder.orderBy(desc(attendanceRecords.attendanceDate));
  }

  async getMissedServicesReport(weeks: number): Promise<any> {
    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - (weeks * 7));

    const membersWithoutRecentAttendance = await db
      .select({
        id: members.id,
        firstName: members.firstName,
        surname: members.surname,
        group: members.gender,
        phone: members.phone,
        lastAttendance: sql`MAX(${attendanceRecords.attendanceDate})`,
      })
      .from(members)
      .leftJoin(
        attendanceRecords,
        and(
          eq(members.id, attendanceRecords.memberId),
          gte(attendanceRecords.attendanceDate, weeksAgo.toISOString().split('T')[0])
        )
      )
      .where(sql`${attendanceRecords.id} IS NULL`)
      .groupBy(members.id, members.firstName, members.surname, members.gender, members.phone);

    return membersWithoutRecentAttendance;
  }

  async getNewMembersReport(startDate: string, endDate: string): Promise<any> {
    return await db
      .select()
      .from(members)
      .where(
        and(
          gte(members.createdAt, new Date(startDate)),
          lte(members.createdAt, new Date(endDate))
        )
      )
      .orderBy(desc(members.createdAt));
  }

  async getInactiveMembersReport(weeks: number): Promise<any> {
    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - (weeks * 7));

    return await db
      .select({
        id: members.id,
        firstName: members.firstName,
        surname: members.surname,
        group: members.gender,
        phone: members.phone,
        lastAttendance: sql`MAX(${attendanceRecords.attendanceDate})`,
      })
      .from(members)
      .leftJoin(attendanceRecords, eq(members.id, attendanceRecords.memberId))
      .groupBy(members.id, members.firstName, members.surname, members.gender, members.phone)
      .having(
        sql`MAX(${attendanceRecords.attendanceDate}) < ${weeksAgo.toISOString().split('T')[0]} OR MAX(${attendanceRecords.attendanceDate}) IS NULL`
      );
  }

  async getGroupAttendanceTrend(startDate: string, endDate: string): Promise<any> {
    return await db
      .select({
        group: members.gender,
        attendanceDate: attendanceRecords.attendanceDate,
        count: count(),
      })
      .from(attendanceRecords)
      .innerJoin(members, eq(attendanceRecords.memberId, members.id))
      .where(
        and(
          gte(attendanceRecords.attendanceDate, startDate),
          lte(attendanceRecords.attendanceDate, endDate)
        )
      )
      .groupBy(members.gender, attendanceRecords.attendanceDate)
      .orderBy(attendanceRecords.attendanceDate, members.gender);
  }

  async getFamilyCheckInSummary(date: string): Promise<any> {
    return await db
      .select({
        parentId: members.parentId,
        parentName: sql`parent.first_name || ' ' || parent.surname`,
        childName: sql`${members.firstName} || ' ' || ${members.surname}`,
        childGroup: members.ageGroup,
        checkInTime: attendanceRecords.checkInTime,
      })
      .from(attendanceRecords)
      .innerJoin(members, eq(attendanceRecords.memberId, members.id))
      .leftJoin(sql`members as parent`, eq(members.parentId, sql`parent.id`))
      .where(
        and(
          eq(attendanceRecords.attendanceDate, date),
          eq(attendanceRecords.checkInMethod, "family")
        )
      )
      .orderBy(attendanceRecords.checkInTime);
  }

  async getFollowUpActionTracker(): Promise<any> {
    return await db
      .select({
        memberId: followUpRecords.memberId,
        memberName: sql`${members.firstName} || ' ' || ${members.surname}`,
        consecutiveAbsences: followUpRecords.consecutiveAbsences,
        lastContactDate: followUpRecords.lastContactDate,
        contactMethod: followUpRecords.contactMethod,
        needsFollowUp: followUpRecords.needsFollowUp,
      })
      .from(followUpRecords)
      .innerJoin(members, eq(followUpRecords.memberId, members.id))
      .orderBy(desc(followUpRecords.lastContactDate));
  }
  // Visitor methods
  async createVisitor(visitor: InsertVisitor): Promise<Visitor> {
    const [newVisitor] = await db.insert(visitors).values(visitor).returning();
    return newVisitor;
  }

  async getVisitor(id: string): Promise<Visitor | undefined> {
    const [visitor] = await db.select().from(visitors).where(eq(visitors.id, id));
    return visitor;
  }

  async getAllVisitors(): Promise<Visitor[]> {
    return await db.select().from(visitors).orderBy(desc(visitors.visitDate));
  }

  async getVisitorsByStatus(status: string): Promise<Visitor[]> {
    return await db.select().from(visitors).where(eq(visitors.followUpStatus, status));
  }

  async updateVisitor(id: string, visitorUpdate: Partial<InsertVisitor>): Promise<Visitor> {
    // If visitor status is being changed to "member", convert them to a proper member
    if (visitorUpdate.followUpStatus === "member") {
      // Get the visitor data first
      const [visitor] = await db.select().from(visitors).where(eq(visitors.id, id));
      if (visitor) {
        // Split name into first and last name
        const nameParts = visitor.name.trim().split(' ');
        const firstName = nameParts[0] || visitor.name;
        const surname = nameParts.slice(1).join(' ') || '';
        
        // Check if member record already exists
        const existingMembers = await db.select().from(members)
          .where(sql`LOWER(${members.firstName}) = LOWER(${firstName}) AND LOWER(${members.surname}) = LOWER(${surname})`);
        
        if (existingMembers.length === 0) {
          const memberData: any = {
            firstName,
            surname,
            gender: visitor.gender || 'male',
            ageGroup: visitor.ageGroup || 'adult',
            phone: visitor.phone || '',
            email: visitor.email || '',
            whatsappNumber: visitor.whatsappNumber || '',
            address: visitor.address || '',
            isCurrentMember: true,
          };
          
          // Only include date fields if they have valid values
          if (visitor.birthday && visitor.birthday.trim() !== '') {
            memberData.dateOfBirth = visitor.birthday;
          }
          if (visitor.weddingAnniversary && visitor.weddingAnniversary.trim() !== '') {
            memberData.weddingAnniversary = visitor.weddingAnniversary;
          }
          
          await db.insert(members).values(memberData);
        }
      }
    }
    
    const [updatedVisitor] = await db
      .update(visitors)
      .set({ ...visitorUpdate, updatedAt: new Date() })
      .where(eq(visitors.id, id))
      .returning();
    return updatedVisitor;
  }

  async updateVisitorAttendanceToMember(visitorId: string, memberId: string): Promise<boolean> {
    try {
      const result = await db
        .update(attendanceRecords)
        .set({ 
          memberId: memberId,
          visitorId: null,
          isGuest: false
        })
        .where(eq(attendanceRecords.visitorId, visitorId));
      
      return true;
    } catch (error) {
      console.error('Error updating visitor attendance to member:', error);
      return false;
    }
  }

  async getAttendanceHistory(startDate: string, endDate: string, filters?: {
    memberId?: string;
    gender?: string;
    ageGroup?: string;
    isCurrentMember?: boolean;
  }): Promise<any[]> {
    let conditions = [
      gte(attendanceRecords.attendanceDate, startDate),
      lte(attendanceRecords.attendanceDate, endDate)
    ];

    // Apply additional filters
    if (filters?.memberId) {
      conditions.push(eq(attendanceRecords.memberId, filters.memberId));
    }
    if (filters?.gender) {
      conditions.push(sql`COALESCE(${members.gender}, ${visitors.gender}) = ${filters.gender}`);
    }
    if (filters?.ageGroup) {
      conditions.push(sql`COALESCE(${members.ageGroup}, ${visitors.ageGroup}) = ${filters.ageGroup}`);
    }
    if (filters?.isCurrentMember !== undefined) {
      conditions.push(eq(members.isCurrentMember, filters.isCurrentMember));
    }

    return db
      .select({
        id: attendanceRecords.id,
        memberId: attendanceRecords.memberId,
        visitorId: attendanceRecords.visitorId,
        attendanceDate: attendanceRecords.attendanceDate,
        checkInTime: attendanceRecords.checkInTime,
        checkInMethod: attendanceRecords.checkInMethod,
        isGuest: attendanceRecords.isGuest,
        member: {
          id: sql`COALESCE(${members.id}, ${visitors.id})`,
          firstName: sql`COALESCE(${members.firstName}, SPLIT_PART(${visitors.name}, ' ', 1))`,
          surname: sql`COALESCE(${members.surname}, SPLIT_PART(${visitors.name}, ' ', 2))`,
          gender: sql`COALESCE(${members.gender}, ${visitors.gender})`,
          ageGroup: sql`COALESCE(${members.ageGroup}, ${visitors.ageGroup})`,
          phone: sql`COALESCE(${members.phone}, ${visitors.phone})`,
          email: sql`COALESCE(${members.email}, ${visitors.email})`,
          isCurrentMember: members.isCurrentMember,
        },
        isVisitor: sql`CASE WHEN ${attendanceRecords.visitorId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(attendanceRecords)
      .leftJoin(members, eq(attendanceRecords.memberId, members.id))
      .leftJoin(visitors, eq(attendanceRecords.visitorId, visitors.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.attendanceDate), desc(attendanceRecords.checkInTime));
  }

  async getAttendanceDateRange(): Promise<{ earliest: string; latest: string }> {
    const result = await db
      .select({
        earliest: sql<string>`MIN(${attendanceRecords.attendanceDate})`,
        latest: sql<string>`MAX(${attendanceRecords.attendanceDate})`,
      })
      .from(attendanceRecords);

    return {
      earliest: result[0]?.earliest || new Date().toISOString().split('T')[0],
      latest: result[0]?.latest || new Date().toISOString().split('T')[0],
    };
  }

  async getAttendanceStatsByDateRange(startDate: string, endDate: string): Promise<{
    totalDays: number;
    totalAttendance: number;
    averagePerDay: number;
    memberAttendance: number;
    visitorAttendance: number;
    genderBreakdown: { male: number; female: number };
    ageGroupBreakdown: { child: number; adolescent: number; adult: number };
  }> {
    const stats = await db
      .select({
        total: count(),
        members: sql<number>`COUNT(CASE WHEN ${attendanceRecords.memberId} IS NOT NULL THEN 1 END)`,
        visitors: sql<number>`COUNT(CASE WHEN ${attendanceRecords.visitorId} IS NOT NULL THEN 1 END)`,
        male: sql<number>`COUNT(CASE WHEN COALESCE(${members.gender}, ${visitors.gender}) = 'male' THEN 1 END)`,
        female: sql<number>`COUNT(CASE WHEN COALESCE(${members.gender}, ${visitors.gender}) = 'female' THEN 1 END)`,
        child: sql<number>`COUNT(CASE WHEN COALESCE(${members.ageGroup}, ${visitors.ageGroup}) = 'child' THEN 1 END)`,
        adolescent: sql<number>`COUNT(CASE WHEN COALESCE(${members.ageGroup}, ${visitors.ageGroup}) = 'adolescent' THEN 1 END)`,
        adult: sql<number>`COUNT(CASE WHEN COALESCE(${members.ageGroup}, ${visitors.ageGroup}) = 'adult' THEN 1 END)`,
      })
      .from(attendanceRecords)
      .leftJoin(members, eq(attendanceRecords.memberId, members.id))
      .leftJoin(visitors, eq(attendanceRecords.visitorId, visitors.id))
      .where(
        and(
          gte(attendanceRecords.attendanceDate, startDate),
          lte(attendanceRecords.attendanceDate, endDate)
        )
      );

    const uniqueDates = await db
      .select({
        date: attendanceRecords.attendanceDate,
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.attendanceDate, startDate),
          lte(attendanceRecords.attendanceDate, endDate)
        )
      )
      .groupBy(attendanceRecords.attendanceDate);

    const totalDays = uniqueDates.length;
    const totalAttendance = stats[0]?.total || 0;

    return {
      totalDays,
      totalAttendance,
      averagePerDay: totalDays > 0 ? Math.round(totalAttendance / totalDays * 100) / 100 : 0,
      memberAttendance: stats[0]?.members || 0,
      visitorAttendance: stats[0]?.visitors || 0,
      genderBreakdown: {
        male: stats[0]?.male || 0,
        female: stats[0]?.female || 0,
      },
      ageGroupBreakdown: {
        child: stats[0]?.child || 0,
        adolescent: stats[0]?.adolescent || 0,
        adult: stats[0]?.adult || 0,
      },
    };
  }
}

export const storage = new DatabaseStorage();
