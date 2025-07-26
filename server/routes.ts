import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertMemberSchema, 
  insertAttendanceRecordSchema, 
  insertAdminUserSchema,
  insertReportConfigSchema,
  insertReportRunSchema,
  insertVisitorSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Member routes
  app.post("/api/members", async (req, res) => {
    try {
      const memberData = insertMemberSchema.parse(req.body);
      const member = await storage.createMember(memberData);
      res.json(member);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid member data" });
    }
  });

  app.get("/api/members", async (req, res) => {
    try {
      const { search, group } = req.query;
      let members;
      
      if (search || group) {
        members = await storage.searchMembers(
          search as string || "",
          group as string
        );
      } else {
        members = await storage.getAllMembers();
      }
      
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch member" });
    }
  });

  app.get("/api/members/:id/children", async (req, res) => {
    try {
      const children = await storage.getMembersByParent(req.params.id);
      res.json(children);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch children" });
    }
  });

  app.put("/api/members/:id", async (req, res) => {
    try {
      const memberData = insertMemberSchema.partial().parse(req.body);
      const member = await storage.updateMember(req.params.id, memberData);
      res.json(member);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid member data" });
    }
  });

  // Fingerprint simulation routes
  app.post("/api/fingerprint/enroll", async (req, res) => {
    try {
      const { memberId } = req.body;
      const fingerprintId = `fp_${memberId}_${Date.now()}`;
      
      const member = await storage.updateMember(memberId, { fingerprintId });
      res.json({ fingerprintId, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to enroll fingerprint" });
    }
  });

  app.post("/api/fingerprint/scan", async (req, res) => {
    try {
      // Simulate fingerprint scanning - in real app this would interface with hardware
      const { deviceId } = req.body;
      
      // Mock fingerprint recognition based on device characteristics
      const mockFingerprintId = `fp_mock_${deviceId || 'unknown'}`;
      
      const member = await storage.getMemberByFingerprint(mockFingerprintId);
      if (member) {
        // Auto check-in the member
        const today = new Date().toISOString().split('T')[0];
        await storage.createAttendanceRecord({
          memberId: member.id,
          attendanceDate: today,
          checkInMethod: "fingerprint",
          isGuest: false,
        });
        
        res.json({ member, checkInSuccess: true });
      } else {
        res.json({ member: null, checkInSuccess: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Fingerprint scan failed" });
    }
  });

  // Attendance routes
  app.post("/api/attendance", async (req, res) => {
    try {
      const attendanceData = insertAttendanceRecordSchema.parse(req.body);
      const record = await storage.createAttendanceRecord(attendanceData);
      res.json(record);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid attendance data" });
    }
  });

  app.get("/api/attendance/today", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendance = await storage.getAttendanceForDate(today);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's attendance" });
    }
  });

  app.get("/api/attendance/stats", async (req, res) => {
    try {
      const { date } = req.query;
      const attendanceDate = date as string || new Date().toISOString().split('T')[0];
      const stats = await storage.getAttendanceStats(attendanceDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance stats" });
    }
  });

  app.get("/api/members/:id/attendance", async (req, res) => {
    try {
      const { limit } = req.query;
      const history = await storage.getMemberAttendanceHistory(
        req.params.id,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance history" });
    }
  });

  // Follow-up routes
  app.get("/api/follow-up", async (req, res) => {
    try {
      const members = await storage.getMembersNeedingFollowUp();
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch follow-up list" });
    }
  });

  app.post("/api/follow-up/:memberId", async (req, res) => {
    try {
      const { method } = req.body; // "sms" or "email"
      await storage.updateFollowUpRecord({
        memberId: req.params.memberId,
        lastContactDate: new Date(),
        contactMethod: method,
        needsFollowUp: false,
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update follow-up record" });
    }
  });

  app.post("/api/follow-up/update-absences", async (req, res) => {
    try {
      await storage.updateConsecutiveAbsences();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update absence records" });
    }
  });

  // Family check-in route
  app.post("/api/attendance/family-checkin", async (req, res) => {
    try {
      const { parentId } = req.body;
      const today = new Date().toISOString().split('T')[0];
      
      // Get parent and children
      const parent = await storage.getMember(parentId);
      const children = await storage.getMembersByParent(parentId);
      
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      // Check in parent
      await storage.createAttendanceRecord({
        memberId: parentId,
        attendanceDate: today,
        checkInMethod: "family",
        isGuest: false,
      });

      // Check in all children
      const childRecords = [];
      for (const child of children) {
        const childRecord = await storage.createAttendanceRecord({
          memberId: child.id,
          attendanceDate: today,
          checkInMethod: "family",
          isGuest: false,
        });
        childRecords.push(childRecord);
      }

      res.json({ 
        parent,
        children,
        attendanceRecords: childRecords.length + 1,
        success: true 
      });
    } catch (error) {
      res.status(500).json({ error: "Family check-in failed" });
    }
  });

  // Export data route
  app.get("/api/export/members", async (req, res) => {
    try {
      const members = await storage.getAllMembers();
      
      // Convert to CSV format
      const csvHeader = "First Name,Surname,Group,Phone,Date of Birth,Current Member,Created At\n";
      const csvData = members.map(member => 
        `"${member.firstName}","${member.surname}","${member.group}","${member.phone}","${member.dateOfBirth}","${member.isCurrentMember}","${member.createdAt}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="church_members.csv"');
      res.send(csvHeader + csvData);
    } catch (error) {
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.get("/api/export/attendance", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // For now, export today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendance = await storage.getAttendanceForDate(today);
      
      const csvHeader = "Member ID,Attendance Date,Check-in Time,Method,Guest\n";
      const csvData = attendance.map(record => 
        `"${record.memberId}","${record.attendanceDate}","${record.checkInTime}","${record.checkInMethod}","${record.isGuest}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="attendance_records.csv"');
      res.send(csvHeader + csvData);
    } catch (error) {
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Admin user routes
  app.post("/api/admin/users", async (req, res) => {
    try {
      const userData = insertAdminUserSchema.parse(req.body);
      const user = await storage.createAdminUser(userData);
      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid user data" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllAdminUsers();
      // Don't send passwords back
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  });

  app.get("/api/admin/users/:id", async (req, res) => {
    try {
      const user = await storage.getAdminUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const userData = insertAdminUserSchema.partial().parse(req.body);
      const user = await storage.updateAdminUser(req.params.id, userData);
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid user data" });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      await storage.deleteAdminUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Analytics and reports routes
  app.get("/api/reports/weekly-attendance", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const report = await storage.getWeeklyAttendanceSummary(
        startDate as string || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate as string || new Date().toISOString().split('T')[0]
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate weekly attendance report" });
    }
  });

  app.get("/api/reports/member-attendance-log", async (req, res) => {
    try {
      const { memberId, startDate, endDate } = req.query;
      const report = await storage.getMemberAttendanceLog(
        memberId as string,
        startDate as string,
        endDate as string
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate member attendance log" });
    }
  });

  app.get("/api/reports/missed-services", async (req, res) => {
    try {
      const { weeks } = req.query;
      const report = await storage.getMissedServicesReport(
        weeks ? parseInt(weeks as string) : 3
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate missed services report" });
    }
  });

  app.get("/api/reports/new-members", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const report = await storage.getNewMembersReport(
        startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate as string || new Date().toISOString().split('T')[0]
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate new members report" });
    }
  });

  app.get("/api/reports/inactive-members", async (req, res) => {
    try {
      const { weeks } = req.query;
      const report = await storage.getInactiveMembersReport(
        weeks ? parseInt(weeks as string) : 4
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate inactive members report" });
    }
  });

  app.get("/api/reports/group-attendance-trend", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const report = await storage.getGroupAttendanceTrend(
        startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate as string || new Date().toISOString().split('T')[0]
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate group attendance trend report" });
    }
  });

  app.get("/api/reports/family-checkin-summary", async (req, res) => {
    try {
      const { date } = req.query;
      const report = await storage.getFamilyCheckInSummary(
        date as string || new Date().toISOString().split('T')[0]
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate family check-in summary" });
    }
  });

  app.get("/api/reports/followup-action-tracker", async (req, res) => {
    try {
      const report = await storage.getFollowUpActionTracker();
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate follow-up action tracker" });
    }
  });

  // Report configuration routes
  app.post("/api/admin/report-configs", async (req, res) => {
    try {
      const configData = insertReportConfigSchema.parse(req.body);
      const config = await storage.createReportConfig(configData);
      res.json(config);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid report config" });
    }
  });

  app.get("/api/admin/report-configs", async (req, res) => {
    try {
      const configs = await storage.getAllReportConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report configs" });
    }
  });

  app.post("/api/admin/report-runs", async (req, res) => {
    try {
      const runData = insertReportRunSchema.parse(req.body);
      const run = await storage.createReportRun(runData);
      res.json(run);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid report run data" });
    }
  });

  app.get("/api/admin/report-runs", async (req, res) => {
    try {
      const { configId } = req.query;
      const runs = await storage.getReportRuns(configId as string);
      res.json(runs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report runs" });
    }
  });

  // Visitor routes
  app.post("/api/visitors", async (req, res) => {
    try {
      const visitorData = insertVisitorSchema.parse(req.body);
      const visitor = await storage.createVisitor(visitorData);
      res.json(visitor);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid visitor data" });
    }
  });

  app.get("/api/visitors", async (req, res) => {
    try {
      const { status } = req.query;
      let visitors;
      
      if (status) {
        visitors = await storage.getVisitorsByStatus(status as string);
      } else {
        visitors = await storage.getAllVisitors();
      }
      
      res.json(visitors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visitors" });
    }
  });

  app.get("/api/visitors/:id", async (req, res) => {
    try {
      const visitor = await storage.getVisitor(req.params.id);
      if (!visitor) {
        return res.status(404).json({ error: "Visitor not found" });
      }
      res.json(visitor);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visitor" });
    }
  });

  app.patch("/api/visitors/:id", async (req, res) => {
    try {
      const visitorUpdate = insertVisitorSchema.partial().parse(req.body);
      const visitor = await storage.updateVisitor(req.params.id, visitorUpdate);
      res.json(visitor);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid visitor data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
