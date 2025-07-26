import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemberSchema, insertAttendanceRecordSchema } from "@shared/schema";
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

  const httpServer = createServer(app);
  return httpServer;
}
