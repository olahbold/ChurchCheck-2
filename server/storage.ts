import { 
  members, 
  events,
  attendanceRecords, 
  followUpRecords,
  adminUsers,
  reportConfigs,
  reportRuns,
  visitors,
  type Member, 
  type InsertMember,
  type Event,
  type InsertEvent,
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
import { eq, desc, and, or, sql, gte, lte, count, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Legacy user methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Member methods
  createMember(member: InsertMember): Promise<Member>;
  getMember(id: string, churchId?: string): Promise<Member | undefined>;
  getMemberByFingerprint(fingerprintId: string, churchId?: string): Promise<Member | undefined>;
  getAllMembers(churchId?: string): Promise<Member[]>;
  getMembersByParent(parentId: string, churchId?: string): Promise<Member[]>;
  updateMember(id: string, member: Partial<InsertMember>): Promise<Member>;
  searchMembers(query: string, group?: string, churchId?: string): Promise<Member[]>;

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

  // Event methods
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: string, churchId?: string): Promise<Event | undefined>;
  getAllEvents(churchId?: string): Promise<Event[]>;
  getActiveEvents(churchId?: string): Promise<Event[]>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;

  // Visitor methods
  createVisitor(visitor: InsertVisitor): Promise<Visitor>;
  getVisitor(id: string): Promise<Visitor | undefined>;
  getAllVisitors(churchId: string): Promise<Visitor[]>;
  getVisitorsByStatus(status: string, churchId: string): Promise<Visitor[]>;
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
  private churchId: string;

  constructor(churchId: string) {
    this.churchId = churchId;
  }
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
        churchId: this.churchId,
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

  async getMember(id: string, churchId?: string): Promise<Member | undefined> {
    let conditions = [eq(members.id, id)];
    if (churchId) {
      conditions.push(eq(members.churchId, churchId));
    }
    const [member] = await db.select().from(members).where(and(...conditions));
    return member || undefined;
  }

  async getMemberByFingerprint(fingerprintId: string, churchId?: string): Promise<Member | undefined> {
    let conditions = [eq(members.fingerprintId, fingerprintId)];
    if (churchId) {
      conditions.push(eq(members.churchId, churchId));
    }
    const [member] = await db.select().from(members).where(and(...conditions));
    return member || undefined;
  }

  async getAllMembers(churchId?: string): Promise<Member[]> {
    let query = db.select().from(members);
    if (churchId) {
      query = query.where(eq(members.churchId, churchId));
    }
    return await query.orderBy(members.firstName);
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

  async searchMembers(query: string, group?: string, churchId?: string): Promise<Member[]> {
    let conditions = [];
    
    if (churchId) {
      conditions.push(eq(members.churchId, churchId));
    }
    
    if (query) {
      // Enhanced search: search in firstName, surname, and full name combinations
      const searchQuery = `%${query.toLowerCase().trim()}%`;
      conditions.push(
        or(
          sql`LOWER(${members.firstName}) LIKE ${searchQuery}`,
          sql`LOWER(${members.surname}) LIKE ${searchQuery}`,
          sql`LOWER(${members.firstName} || ' ' || ${members.surname}) LIKE ${searchQuery}`,
          sql`LOWER(${members.surname} || ' ' || ${members.firstName}) LIKE ${searchQuery}`
        )
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
        eventId: attendanceRecords.eventId,
        churchId: attendanceRecords.churchId,
        member: {
          id: members.id,
          firstName: members.firstName,
          surname: members.surname,
          gender: members.gender,
          ageGroup: members.ageGroup,
          phone: members.phone,
          email: members.email,
        },
        visitor: {
          id: visitors.id,
          name: visitors.name,
          gender: visitors.gender,
          ageGroup: visitors.ageGroup,
        },
        event: {
          id: events.id,
          name: events.name,
          eventType: events.eventType,
        }
      })
      .from(attendanceRecords)
      .leftJoin(members, eq(attendanceRecords.memberId, members.id))
      .leftJoin(visitors, eq(attendanceRecords.visitorId, visitors.id))
      .leftJoin(events, eq(attendanceRecords.eventId, events.id))
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
      churchId: record.churchId,
      eventId: record.eventId,
      // Unified person data - use member data if it's a member, visitor data if it's a visitor
      member: record.member ? record.member : {
        id: record.visitorId,
        firstName: (record.visitor?.name || record.visitorName || 'Visitor').split(' ')[0],
        surname: (record.visitor?.name || record.visitorName || '').split(' ').slice(1).join(' '),
        gender: record.visitor?.gender || record.visitorGender,
        ageGroup: record.visitor?.ageGroup || record.visitorAgeGroup,
        phone: null,
        email: null,
      },
      visitorName: record.visitor?.name || record.visitorName,
      isVisitor: !record.memberId,
      event: record.event
    }));
  }

  async getAttendanceHistoryWithEvents(churchId: string, filters: {
    startDate?: string;
    endDate?: string;
    gender?: string;
    ageGroup?: string;
    isCurrentMember?: string;
    memberId?: string;
  }): Promise<any[]> {
    let conditions = [eq(attendanceRecords.churchId, churchId)];
    
    if (filters.startDate) conditions.push(gte(attendanceRecords.attendanceDate, filters.startDate));
    if (filters.endDate) conditions.push(lte(attendanceRecords.attendanceDate, filters.endDate));
    if (filters.gender && filters.gender !== 'all') conditions.push(eq(members.gender, filters.gender));
    if (filters.ageGroup && filters.ageGroup !== 'all') conditions.push(eq(members.ageGroup, filters.ageGroup));
    if (filters.memberId) conditions.push(eq(attendanceRecords.memberId, filters.memberId));

    const result = await db
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
        eventId: attendanceRecords.eventId,
        member: {
          id: members.id,
          firstName: members.firstName,
          surname: members.surname,
          gender: members.gender,
          ageGroup: members.ageGroup,
          phone: members.phone,
          email: members.email,
        },
        event: {
          id: events.id,
          name: events.name,
          eventType: events.eventType,
        }
      })
      .from(attendanceRecords)
      .leftJoin(members, eq(attendanceRecords.memberId, members.id))
      .leftJoin(events, eq(attendanceRecords.eventId, events.id))
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.attendanceDate), desc(attendanceRecords.checkInTime));

    return result.map(record => ({
      ...record,
      isVisitor: !record.memberId,
    }));
  }

  async getAttendanceInRange(startDate: string, endDate: string, churchId: string): Promise<any[]> {
    const result = await db
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
        eventId: attendanceRecords.eventId,
        member: {
          id: members.id,
          firstName: members.firstName,
          surname: members.surname,
          gender: members.gender,
          ageGroup: members.ageGroup,
          phone: members.phone,
          email: members.email,
        },
        event: {
          id: events.id,
          name: events.name,
          eventType: events.eventType,
        }
      })
      .from(attendanceRecords)
      .leftJoin(members, eq(attendanceRecords.memberId, members.id))
      .leftJoin(events, eq(attendanceRecords.eventId, events.id))
      .where(
        and(
          eq(attendanceRecords.churchId, churchId),
          sql`${attendanceRecords.attendanceDate} >= ${startDate}`,
          sql`${attendanceRecords.attendanceDate} <= ${endDate}`
        )
      )
      .orderBy(desc(attendanceRecords.checkInTime));

    return result;
  }

  // Get attendance count for specific events
  async getEventAttendanceCounts(churchId: string): Promise<any[]> {
    const result = await db
      .select({
        eventId: attendanceRecords.eventId,
        eventName: events.name,
        eventType: events.eventType,
        totalAttendees: sql<number>`count(*)`,
        members: sql<number>`sum(case when ${attendanceRecords.memberId} is not null then 1 else 0 end)`,
        visitors: sql<number>`sum(case when ${attendanceRecords.visitorId} is not null then 1 else 0 end)`,
        maleCount: sql<number>`sum(case when coalesce(${members.gender}, ${attendanceRecords.visitorGender}) = 'male' then 1 else 0 end)`,
        femaleCount: sql<number>`sum(case when coalesce(${members.gender}, ${attendanceRecords.visitorGender}) = 'female' then 1 else 0 end)`,
        childCount: sql<number>`sum(case when coalesce(${members.ageGroup}, ${attendanceRecords.visitorAgeGroup}) = 'child' then 1 else 0 end)`,
        adolescentCount: sql<number>`sum(case when coalesce(${members.ageGroup}, ${attendanceRecords.visitorAgeGroup}) = 'adolescent' then 1 else 0 end)`,
        adultCount: sql<number>`sum(case when coalesce(${members.ageGroup}, ${attendanceRecords.visitorAgeGroup}) = 'adult' then 1 else 0 end)`,
      })
      .from(attendanceRecords)
      .leftJoin(members, eq(attendanceRecords.memberId, members.id))
      .leftJoin(events, eq(attendanceRecords.eventId, events.id))
      .where(
        and(
          eq(attendanceRecords.churchId, churchId),
          isNotNull(attendanceRecords.eventId)
        )
      )
      .groupBy(attendanceRecords.eventId, events.name, events.eventType)
      .orderBy(events.name);

    return result;
  }

  // Get attendance stats for a specific event
  async getEventAttendanceStats(churchId: string, eventId: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db
      .select({
        total: sql<number>`count(*)`,
        male: sql<number>`sum(case when coalesce(${members.gender}, ${attendanceRecords.visitorGender}, ${visitors.gender}) = 'male' then 1 else 0 end)`,
        female: sql<number>`sum(case when coalesce(${members.gender}, ${attendanceRecords.visitorGender}, ${visitors.gender}) = 'female' then 1 else 0 end)`,
        child: sql<number>`sum(case when coalesce(${members.ageGroup}, ${attendanceRecords.visitorAgeGroup}, ${visitors.ageGroup}) = 'child' then 1 else 0 end)`,
        adolescent: sql<number>`sum(case when coalesce(${members.ageGroup}, ${attendanceRecords.visitorAgeGroup}, ${visitors.ageGroup}) = 'adolescent' then 1 else 0 end)`,
        adult: sql<number>`sum(case when coalesce(${members.ageGroup}, ${attendanceRecords.visitorAgeGroup}, ${visitors.ageGroup}) = 'adult' then 1 else 0 end)`,
        members: sql<number>`sum(case when ${attendanceRecords.memberId} is not null then 1 else 0 end)`,
        visitors: sql<number>`sum(case when ${attendanceRecords.visitorId} is not null then 1 else 0 end)`,
      })
      .from(attendanceRecords)
      .leftJoin(members, eq(attendanceRecords.memberId, members.id))
      .leftJoin(visitors, eq(attendanceRecords.visitorId, visitors.id))
      .where(
        and(
          eq(attendanceRecords.churchId, churchId),
          eq(attendanceRecords.eventId, eventId),
          eq(attendanceRecords.attendanceDate, today)
        )
      );

    return result[0] || {
      total: 0,
      male: 0,
      female: 0,
      child: 0,
      adolescent: 0,
      adult: 0,
      members: 0,
      visitors: 0,
    };
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
    try {
      console.log('Updating follow-up record for member:', record.memberId, record);
      
      const [existingRecord] = await db
        .select()
        .from(followUpRecords)
        .where(eq(followUpRecords.memberId, record.memberId));

      if (existingRecord) {
        console.log('Updating existing record');
        const [updatedRecord] = await db
          .update(followUpRecords)
          .set(record)
          .where(eq(followUpRecords.memberId, record.memberId))
          .returning();
        return updatedRecord;
      } else {
        console.log('Creating new record');
        const [newRecord] = await db
          .insert(followUpRecords)
          .values(record)
          .returning();
        return newRecord;
      }
    } catch (error) {
      console.error('Error in updateFollowUpRecord:', error);
      throw error;
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
    try {
      // This would be called after each service to update absence counts
      // Implementation would check last attendance and update follow-up records
      const threeWeeksAgo = new Date();
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
      const threeWeeksAgoStr = threeWeeksAgo.toISOString().split('T')[0];

      // Find all current members
      const allMembers = await db.select({ 
        id: members.id, 
        firstName: members.firstName, 
        surname: members.surname 
      }).from(members).where(eq(members.isCurrentMember, true));

      // Find members who have attended in the last 3 weeks
      const recentAttendees = await db
        .select({ memberId: attendanceRecords.memberId })
        .from(attendanceRecords)
        .where(
          and(
            gte(attendanceRecords.attendanceDate, threeWeeksAgoStr),
            isNotNull(attendanceRecords.memberId)
          )
        )
        .groupBy(attendanceRecords.memberId);

      const recentAttendeeIds = new Set(recentAttendees.map(r => r.memberId));

      // Find members who haven't attended in 3+ weeks
      const membersWithoutRecentAttendance = allMembers.filter(
        member => !recentAttendeeIds.has(member.id)
      );

      console.log(`Found ${membersWithoutRecentAttendance.length} members needing follow-up`);

      for (const member of membersWithoutRecentAttendance) {
        await this.updateFollowUpRecord({
          churchId: this.churchId,
          memberId: member.id,
          consecutiveAbsences: 3,
          needsFollowUp: true,
        });
        console.log(`Updated follow-up for ${member.firstName} ${member.surname}`);
      }
    } catch (error) {
      console.error('Error updating consecutive absences:', error);
      throw error;
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
        gender: members.gender,
        ageGroup: members.ageGroup,
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
      .groupBy(attendanceRecords.attendanceDate, members.gender, members.ageGroup)
      .orderBy(attendanceRecords.attendanceDate, members.gender, members.ageGroup);

    return summary;
  }

  async getAttendanceStatsForRange(startDate: string, endDate: string): Promise<any> {
    const stats = await db
      .select({
        totalAttendance: count(),
        totalMembers: sql`COUNT(CASE WHEN ${attendanceRecords.isGuest} = false THEN 1 END)`,
        totalVisitors: sql`COUNT(CASE WHEN ${attendanceRecords.isGuest} = true THEN 1 END)`,
        maleCount: sql`COUNT(CASE WHEN ${members.gender} = 'male' THEN 1 END)`,
        femaleCount: sql`COUNT(CASE WHEN ${members.gender} = 'female' THEN 1 END)`,
        childCount: sql`COUNT(CASE WHEN ${members.ageGroup} = 'child' THEN 1 END)`,
        adolescentCount: sql`COUNT(CASE WHEN ${members.ageGroup} = 'adolescent' THEN 1 END)`,
        adultCount: sql`COUNT(CASE WHEN ${members.ageGroup} = 'adult' THEN 1 END)`,
      })
      .from(attendanceRecords)
      .leftJoin(members, eq(attendanceRecords.memberId, members.id))
      .where(
        and(
          gte(attendanceRecords.attendanceDate, startDate),
          lte(attendanceRecords.attendanceDate, endDate)
        )
      );

    const uniqueDays = await db
      .select({
        uniqueDates: sql`COUNT(DISTINCT ${attendanceRecords.attendanceDate})`,
      })
      .from(attendanceRecords)
      .where(
        and(
          gte(attendanceRecords.attendanceDate, startDate),
          lte(attendanceRecords.attendanceDate, endDate)
        )
      );

    const result = stats[0];
    const totalDays = Number(uniqueDays[0]?.uniqueDates) || 0;
    const averageAttendance = totalDays > 0 ? Math.round(Number(result.totalAttendance) / totalDays) : 0;

    return {
      totalDays,
      totalAttendance: result.totalAttendance,
      averageAttendance,
      totalMembers: result.totalMembers,
      totalVisitors: result.totalVisitors,
      maleCount: result.maleCount,
      femaleCount: result.femaleCount,
      childCount: result.childCount,
      adolescentCount: result.adolescentCount,
      adultCount: result.adultCount,
    };
  }

  async getMemberAttendanceLog(memberId?: string, startDate?: string, endDate?: string): Promise<any> {
    // If specific member is requested, return traditional format
    if (memberId) {
      let conditions = [
        eq(attendanceRecords.memberId, memberId),
        eq(attendanceRecords.churchId, this.churchId)
      ];
      if (startDate) conditions.push(gte(attendanceRecords.attendanceDate, startDate));
      if (endDate) conditions.push(lte(attendanceRecords.attendanceDate, endDate));

      return await db
        .select({
          memberName: sql`${members.firstName} || ' ' || ${members.surname}`,
          gender: members.gender,
          ageGroup: members.ageGroup,
          attendanceDate: attendanceRecords.attendanceDate,
          checkInTime: sql`EXTRACT(HOUR FROM ${attendanceRecords.checkInTime}) || ':' || LPAD(EXTRACT(MINUTE FROM ${attendanceRecords.checkInTime})::text, 2, '0')`,
          checkInMethod: sql`
            CASE 
              WHEN ${attendanceRecords.checkInMethod} = 'family' THEN 'Family (manual)'
              WHEN ${attendanceRecords.checkInMethod} = 'manual' THEN 'Manual'
              WHEN ${attendanceRecords.checkInMethod} = 'fingerprint' THEN 'Fingerprint'
              WHEN ${attendanceRecords.checkInMethod} = 'visitor' THEN 'Visitor'
              ELSE ${attendanceRecords.checkInMethod}
            END
          `,
        })
        .from(attendanceRecords)
        .innerJoin(members, eq(attendanceRecords.memberId, members.id))
        .where(and(...conditions))
        .orderBy(desc(attendanceRecords.attendanceDate));
    }

    // Enhanced Matrix Format Report for comprehensive view
    // Step 1: Get all distinct attendance dates in the range for this church
    let dateConditions = [eq(attendanceRecords.churchId, this.churchId)];
    if (startDate) dateConditions.push(gte(attendanceRecords.attendanceDate, startDate));
    if (endDate) dateConditions.push(lte(attendanceRecords.attendanceDate, endDate));
    
    const attendanceDates = await db
      .selectDistinct({
        attendanceDate: attendanceRecords.attendanceDate
      })
      .from(attendanceRecords)
      .where(and(...dateConditions))
      .orderBy(attendanceRecords.attendanceDate);
    
    // Step 2: Get all members for this church
    const allMembers = await db
      .select({
        id: members.id,
        memberName: sql`${members.firstName} || ' ' || ${members.surname}`,
        firstName: members.firstName,
        surname: members.surname,
        gender: members.gender,
        ageGroup: members.ageGroup,
        phone: members.phone,
        title: members.title
      })
      .from(members)
      .where(eq(members.churchId, this.churchId))
      .orderBy(members.firstName, members.surname);

    // Step 3: Get all attendance records for the date range and church
    const attendanceData = await db
      .select({
        memberId: attendanceRecords.memberId,
        attendanceDate: attendanceRecords.attendanceDate,
        checkInTime: sql`EXTRACT(HOUR FROM ${attendanceRecords.checkInTime}) || ':' || LPAD(EXTRACT(MINUTE FROM ${attendanceRecords.checkInTime})::text, 2, '0')`,
        checkInMethod: attendanceRecords.checkInMethod
      })
      .from(attendanceRecords)
      .where(and(...dateConditions));

    // Step 4: Create attendance lookup map
    const attendanceMap = new Map<string, any>();
    attendanceData.forEach(record => {
      const key = `${record.memberId}-${record.attendanceDate}`;
      attendanceMap.set(key, {
        checkInTime: record.checkInTime,
        checkInMethod: record.checkInMethod
      });
    });

    // Step 5: Build the matrix report
    const matrixReport = allMembers.map(member => {
      const row: any = {
        memberName: member.memberName,
        firstName: member.firstName,
        surname: member.surname,
        gender: member.gender,
        ageGroup: member.ageGroup,
        phone: member.phone,
        title: member.title,
        totalPresent: 0,
        totalAbsent: 0,
        attendancePercentage: "0%"
      };

      // Add attendance status for each date
      attendanceDates.forEach(dateRecord => {
        const key = `${member.id}-${dateRecord.attendanceDate}`;
        const attendance = attendanceMap.get(key);
        const dateKey = `date_${dateRecord.attendanceDate.replace(/-/g, '_')}`;
        
        if (attendance) {
          row[dateKey] = "YES";
          row[`${dateKey}_time`] = attendance.checkInTime;
          row[`${dateKey}_method`] = attendance.checkInMethod;
          row.totalPresent++;
        } else {
          row[dateKey] = "NO";
          row[`${dateKey}_time`] = "";
          row[`${dateKey}_method`] = "";
          row.totalAbsent++;
        }
      });

      // Calculate attendance percentage
      const totalDays = attendanceDates.length;
      if (totalDays > 0) {
        const percentage = Math.round((row.totalPresent / totalDays) * 100);
        row.attendancePercentage = `${percentage}%`;
      }

      return row;
    });



    // Step 6: Calculate summary statistics
    const summary = {
      totalMembers: allMembers.length,
      totalDates: attendanceDates.length,
      dateRange: attendanceDates.length > 0 ? {
        startDate: attendanceDates[0].attendanceDate,
        endDate: attendanceDates[attendanceDates.length - 1].attendanceDate
      } : null,
      attendanceDates: attendanceDates.map(d => d.attendanceDate),
      totalAttendanceRecords: attendanceData.length
    };

    return {
      type: 'matrix',
      summary,
      data: matrixReport,
      attendanceDates: attendanceDates.map(d => d.attendanceDate)
    };
  }

  async getMissedServicesReport(weeks: number): Promise<any> {
    const weeksAgo = new Date();
    weeksAgo.setDate(weeksAgo.getDate() - (weeks * 7));
    const cutoffDate = weeksAgo.toISOString().split('T')[0];

    // First get all members with their most recent attendance date (if any)
    const membersWithLastAttendance = await db
      .select({
        memberId: members.id,
        memberName: sql`${members.firstName} || ' ' || ${members.surname}`,
        title: members.title,
        gender: members.gender,
        ageGroup: members.ageGroup,
        phone: members.phone,
        email: members.email,
        whatsappNumber: members.whatsappNumber,
        address: members.address,
        dateOfBirth: members.dateOfBirth,
        weddingAnniversary: members.weddingAnniversary,
        lastAttendance: sql`MAX(${attendanceRecords.attendanceDate})`,
        createdAt: members.createdAt,
      })
      .from(members)
      .leftJoin(
        attendanceRecords,
        eq(members.id, attendanceRecords.memberId)
      )
      .where(eq(members.churchId, this.churchId))
      .groupBy(
        members.id, 
        members.title, 
        members.firstName, 
        members.surname, 
        members.gender, 
        members.ageGroup, 
        members.phone, 
        members.email, 
        members.whatsappNumber, 
        members.address, 
        members.dateOfBirth, 
        members.weddingAnniversary, 
        members.createdAt
      );

    // Filter to only include members who either:
    // 1. Have never attended (lastAttendance is null)
    // 2. Their last attendance was more than X weeks ago
    const missedServicesMembers = membersWithLastAttendance.filter(member => {
      if (!member.lastAttendance) {
        // Never attended
        return true;
      }
      // Last attendance was before the cutoff date
      return member.lastAttendance < cutoffDate;
    });

    return missedServicesMembers;
  }

  async getNewMembersReport(startDate: string, endDate: string): Promise<any> {
    return await db
      .select({
        memberName: sql`${members.firstName} || ' ' || ${members.surname}`,
        title: members.title,
        gender: members.gender,
        ageGroup: members.ageGroup,
        phone: members.phone,
        email: members.email,
        whatsappNumber: members.whatsappNumber,
        address: members.address,
        dateOfBirth: members.dateOfBirth,
        weddingAnniversary: members.weddingAnniversary,
        isCurrentMember: members.isCurrentMember,
        lastAttendance: members.createdAt,
      })
      .from(members)
      .where(
        and(
          eq(members.churchId, this.churchId),
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
        memberName: sql`${members.firstName} || ' ' || ${members.surname}`,
        title: members.title,
        gender: members.gender,
        ageGroup: members.ageGroup,
        phone: members.phone,
        email: members.email,
        whatsappNumber: members.whatsappNumber,
        address: members.address,
        dateOfBirth: members.dateOfBirth,
        weddingAnniversary: members.weddingAnniversary,
        lastAttendance: sql`COALESCE(MAX(${attendanceRecords.attendanceDate}), 'Never')`,
      })
      .from(members)
      .leftJoin(attendanceRecords, and(
        eq(members.id, attendanceRecords.memberId),
        eq(attendanceRecords.churchId, this.churchId)
      ))
      .where(eq(members.churchId, this.churchId))
      .groupBy(members.id, members.title, members.firstName, members.surname, members.gender, members.ageGroup, members.phone, members.email, members.whatsappNumber, members.address, members.dateOfBirth, members.weddingAnniversary)
      .having(
        sql`MAX(${attendanceRecords.attendanceDate}) < ${weeksAgo.toISOString().split('T')[0]} OR MAX(${attendanceRecords.attendanceDate}) IS NULL`
      );
  }

  async getGroupAttendanceTrend(startDate: string, endDate: string): Promise<any> {
    return await db
      .select({
        gender: members.gender,
        ageGroup: members.ageGroup,
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
      .groupBy(members.gender, members.ageGroup, attendanceRecords.attendanceDate)
      .orderBy(attendanceRecords.attendanceDate, members.gender, members.ageGroup);
  }

  async getFamilyCheckInSummary(date: string): Promise<any> {
    return await db
      .select({
        parentId: members.parentId,
        parentName: sql`
          CASE 
            WHEN ${members.parentId} IS NOT NULL AND ${members.parentId} != '' THEN
              (SELECT first_name || ' ' || surname FROM members p WHERE p.id = ${members.parentId})
            ELSE 'No Parent'
          END
        `,
        childName: sql`${members.firstName} || ' ' || ${members.surname}`,
        childGender: members.gender,
        childAgeGroup: members.ageGroup,
        checkInTime: sql`TO_CHAR(${attendanceRecords.checkInTime}, 'HH24:MI:SS')`,
        checkInMethod: sql`
          CASE 
            WHEN ${attendanceRecords.checkInMethod} = 'family' THEN 'Family (manual)'
            ELSE ${attendanceRecords.checkInMethod}
          END
        `,
      })
      .from(attendanceRecords)
      .innerJoin(members, eq(attendanceRecords.memberId, members.id))
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
        memberName: sql`${members.firstName} || ' ' || ${members.surname}`,
        title: members.title,
        gender: members.gender,
        ageGroup: members.ageGroup,
        phone: members.phone,
        email: members.email,
        whatsappNumber: members.whatsappNumber,
        address: members.address,
        dateOfBirth: sql`TO_CHAR(${members.dateOfBirth}, 'YYYY-MM-DD')`,
        weddingAnniversary: sql`TO_CHAR(${members.weddingAnniversary}, 'YYYY-MM-DD')`,
        consecutiveAbsences: followUpRecords.consecutiveAbsences,
        lastContactDate: sql`TO_CHAR(${followUpRecords.lastContactDate}, 'YYYY-MM-DD HH24:MI:SS')`,
        contactMethod: followUpRecords.contactMethod,
        needsFollowUp: followUpRecords.needsFollowUp,
        memberSince: sql`TO_CHAR(${members.createdAt}, 'YYYY-MM-DD HH24:MI:SS')`,
      })
      .from(followUpRecords)
      .innerJoin(members, eq(followUpRecords.memberId, members.id))
      .orderBy(desc(followUpRecords.lastContactDate));
  }
  // Visitor methods
  async createVisitor(visitor: InsertVisitor): Promise<Visitor> {
    const [newVisitor] = await db.insert(visitors).values({
      ...visitor,
      churchId: this.churchId
    }).returning();
    return newVisitor;
  }

  async getVisitor(id: string): Promise<Visitor | undefined> {
    const [visitor] = await db.select().from(visitors).where(eq(visitors.id, id));
    return visitor;
  }

  async getAllVisitors(churchId: string): Promise<Visitor[]> {
    return await db.select().from(visitors).where(eq(visitors.churchId, churchId)).orderBy(desc(visitors.visitDate));
  }

  async getVisitorsByStatus(status: string, churchId: string): Promise<Visitor[]> {
    return await db.select().from(visitors).where(and(eq(visitors.followUpStatus, status), eq(visitors.churchId, churchId)));
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
            churchId: this.churchId,
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

  // Event methods implementation
  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values({
      ...event,
      id: crypto.randomUUID(),
      churchId: this.churchId,
    }).returning();
    return newEvent;
  }

  async getEvent(id: string, churchId?: string): Promise<Event | undefined> {
    const conditions = [eq(events.id, id)];
    if (this.churchId) {
      conditions.push(eq(events.churchId, this.churchId));
    }
    
    const [event] = await db
      .select()
      .from(events)
      .where(and(...conditions));
    return event;
  }

  async getAllEvents(churchId?: string): Promise<Event[]> {
    const conditions = this.churchId ? [eq(events.churchId, this.churchId)] : [];
    
    return await db
      .select()
      .from(events)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(events.createdAt));
  }

  async getActiveEvents(churchId?: string): Promise<Event[]> {
    const conditions = [eq(events.isActive, true)];
    if (this.churchId) {
      conditions.push(eq(events.churchId, this.churchId));
    }
    
    return await db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(events.name);
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set({
        ...event,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }
}
