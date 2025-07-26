import { 
  members, 
  attendanceRecords, 
  followUpRecords,
  type Member, 
  type InsertMember, 
  type AttendanceRecord, 
  type InsertAttendanceRecord,
  type FollowUpRecord,
  type InsertFollowUpRecord,
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
    children: number;
    adolescent: number;
  }>;

  // Follow-up methods
  updateFollowUpRecord(record: InsertFollowUpRecord): Promise<FollowUpRecord>;
  getMembersNeedingFollowUp(): Promise<(Member & { followUpRecord: FollowUpRecord })[]>;
  updateConsecutiveAbsences(): Promise<void>;
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
        group: 'male',
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
      .values({
        ...member,
        updatedAt: new Date(),
      })
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
    let queryBuilder = db.select().from(members);
    
    if (query) {
      queryBuilder = queryBuilder.where(
        sql`${members.firstName} ILIKE ${`%${query}%`} OR ${members.surname} ILIKE ${`%${query}%`}`
      );
    }
    
    if (group && group !== 'all') {
      queryBuilder = queryBuilder.where(eq(members.group, group));
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

  async getAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
    return await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.attendanceDate, date))
      .orderBy(desc(attendanceRecords.checkInTime));
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
    children: number;
    adolescent: number;
  }> {
    const stats = await db
      .select({
        group: members.group,
        count: count(),
      })
      .from(attendanceRecords)
      .innerJoin(members, eq(attendanceRecords.memberId, members.id))
      .where(eq(attendanceRecords.attendanceDate, date))
      .groupBy(members.group);

    const result = {
      total: 0,
      male: 0,
      female: 0,
      children: 0,
      adolescent: 0,
    };

    stats.forEach(stat => {
      result.total += stat.count;
      if (stat.group === 'male') result.male = stat.count;
      if (stat.group === 'female') result.female = stat.count;
      if (stat.group === 'child') result.children = stat.count;
      if (stat.group === 'adolescent') result.adolescent = stat.count;
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
}

export const storage = new DatabaseStorage();
