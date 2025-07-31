import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { churchStorage } from "./church-storage.js";
import churchRoutes from "./church-routes.js";
import subscriptionRoutes from "./subscription-routes.js";
import { 
  requireFeature, 
  checkTrialStatus, 
  checkMemberLimit 
} from "./feature-gate-middleware.js";
import { 
  authenticateToken,
  requireRole,
  ensureChurchContext,
  hashPassword,
  type AuthenticatedRequest
} from "./auth.js";
import { 
  insertMemberSchema, 
  updateMemberSchema,
  insertAttendanceRecordSchema, 
  insertAdminUserSchema,
  insertChurchUserSchema,
  insertReportConfigSchema,
  insertReportRunSchema,
  insertVisitorSchema
} from "@shared/schema";
import { z } from "zod";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply trial status checking to all routes
  app.use('/api', checkTrialStatus);

  // Member routes with feature gating
  app.post("/api/members", authenticateToken, ensureChurchContext, checkMemberLimit, requireFeature('member_management'), async (req: AuthenticatedRequest, res) => {
    try {
      // Clean up empty string values for optional fields
      const cleanedData = { ...req.body };
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === "" || cleanedData[key] === null) {
          if (key === 'dateOfBirth' || key === 'weddingAnniversary') {
            delete cleanedData[key]; // Remove completely for date fields
          } else if (key === 'parentId') {
            cleanedData[key] = ""; // Convert parentId to empty string, not null or undefined
          } else {
            cleanedData[key] = undefined;
          }
        }
      });
      
      // Add churchId from the authenticated request
      const memberDataWithChurch = {
        ...cleanedData,
        churchId: req.churchId || req.user?.churchId
      };
      
      const memberData = insertMemberSchema.parse(memberDataWithChurch);
      const member = await storage.createMember(memberData);
      res.json(member);
    } catch (error) {
      console.error('Member creation error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid member data" });
    }
  });

  app.get("/api/members", authenticateToken, ensureChurchContext, async (req: AuthenticatedRequest, res) => {
    try {
      const { search, group } = req.query;
      let members;
      
      if (search || group) {
        members = await storage.searchMembers(
          search as string || "",
          group as string,
          req.churchId
        );
      } else {
        members = await storage.getAllMembers(req.churchId);
      }
      
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.get("/api/members/:id", authenticateToken, ensureChurchContext, async (req: AuthenticatedRequest, res) => {
    try {
      const member = await storage.getMember(req.params.id, req.churchId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch member" });
    }
  });

  // Bulk upload members
  app.post("/api/members/bulk-upload", authenticateToken, ensureChurchContext, checkMemberLimit, requireFeature('member_management'), async (req: AuthenticatedRequest, res) => {
    try {
      const { members } = req.body;
      
      if (!Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ error: "No members data provided" });
      }

      let created = 0;
      const errors: string[] = [];

      for (const memberData of members) {
        try {
          // Clean up the data like in single member creation
          const cleanedData = { ...memberData };
          Object.keys(cleanedData).forEach(key => {
            if (cleanedData[key] === "" || cleanedData[key] === null) {
              if (key === 'dateOfBirth' || key === 'weddingAnniversary') {
                delete cleanedData[key];
              } else if (key === 'parentId' && cleanedData[key] === "") {
                cleanedData[key] = null;
              } else {
                cleanedData[key] = undefined;
              }
            }
          });

          // Convert boolean strings to actual booleans
          if (typeof cleanedData.isCurrentMember === 'string') {
            cleanedData.isCurrentMember = cleanedData.isCurrentMember.toLowerCase() === 'true';
          }

          // Remove the rowNumber field that was added for validation
          delete cleanedData.rowNumber;
          
          // Add churchId from the authenticated request
          const memberDataWithChurch = {
            ...cleanedData,
            churchId: req.churchId
          };

          const validatedData = insertMemberSchema.parse(memberDataWithChurch);
          await storage.createMember(validatedData);
          created++;
        } catch (error) {
          errors.push(`Member ${memberData.firstName} ${memberData.surname}: ${error instanceof Error ? error.message : 'Invalid data'}`);
        }
      }

      res.json({ 
        created, 
        total: members.length, 
        errors: errors.length > 0 ? errors : undefined 
      });
    } catch (error) {
      console.error('Bulk upload error:', error);
      res.status(500).json({ error: "Bulk upload failed" });
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
      console.log('Update request body:', JSON.stringify(req.body, null, 2));
      
      // Clean up the data before validation
      const cleanedData = { ...req.body };
      
      // Remove empty strings and convert them to undefined
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === '') {
          cleanedData[key] = undefined;
        }
      });
      
      const memberData = updateMemberSchema.parse(cleanedData);
      console.log('Parsed member data:', JSON.stringify(memberData, null, 2));
      
      const member = await storage.updateMember(req.params.id, memberData);
      res.json(member);
    } catch (error) {
      console.error('Update member error:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: "Invalid member data" });
      }
    }
  });

  // Fingerprint simulation routes
  app.post("/api/fingerprint/enroll", async (req, res) => {
    try {
      const { memberId, fingerprintId } = req.body;
      // Use provided fingerprintId or generate new one
      const enrollFingerprintId = fingerprintId || `fp_${memberId}_${Date.now()}`;
      
      const member = await storage.updateMember(memberId, { fingerprintId: enrollFingerprintId });
      res.json({ fingerprintId: enrollFingerprintId, success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to enroll fingerprint" });
    }
  });

  app.post("/api/fingerprint/scan", async (req, res) => {
    try {
      // Simulate fingerprint scanning - in real app this would interface with hardware
      const { fingerprintId, deviceId } = req.body;
      
      // Use provided fingerprintId or generate mock one based on device characteristics
      const scanFingerprintId = fingerprintId || `fp_mock_${deviceId || 'unknown'}`;
      
      const member = await storage.getMemberByFingerprint(scanFingerprintId);
      if (member) {
        // Check if member already checked in today
        const today = new Date().toISOString().split('T')[0];
        const existingAttendance = await storage.getAttendanceForDate(today);
        
        const isDuplicate = existingAttendance.some(record => record.memberId === member.id);
        
        if (isDuplicate) {
          return res.json({ 
            member, 
            checkInSuccess: false,
            isDuplicate: true,
            message: "Member has already checked in today. Only one check-in per day is allowed." 
          });
        }
        
        // Auto check-in the member
        await storage.createAttendanceRecord({
          churchId: member.churchId,
          memberId: member.id,
          attendanceDate: today,
          checkInMethod: "fingerprint",
          isGuest: false,
        });
        
        res.json({ 
          member, 
          checkInSuccess: true,
          message: "Check-in successful" 
        });
      } else {
        // Return the scanned fingerprint ID so it can be used for enrollment
        res.json({ 
          member: null, 
          checkInSuccess: false,
          scannedFingerprintId: scanFingerprintId,
          message: "Fingerprint not recognized" 
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Fingerprint scan failed" });
    }
  });

  // Attendance routes with authentication
  app.post("/api/attendance", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const attendanceData = insertAttendanceRecordSchema.parse({
        ...req.body,
        churchId: req.churchId
      });
      
      // Check if member/visitor already checked in today
      const today = attendanceData.attendanceDate || new Date().toISOString().split('T')[0];
      const existingAttendance = await storage.getAttendanceForDate(today);
      
      // Check for duplicate check-in
      const isDuplicate = existingAttendance.some(record => 
        (attendanceData.memberId && record.memberId === attendanceData.memberId) ||
        (attendanceData.visitorId && record.visitorId === attendanceData.visitorId)
      );
      
      if (isDuplicate) {
        const personType = attendanceData.memberId ? 'Member' : 'Visitor';
        return res.status(400).json({ 
          error: `${personType} has already checked in today. Only one check-in per day is allowed.`,
          isDuplicate: true
        });
      }
      
      const record = await storage.createAttendanceRecord(attendanceData);
      res.json(record);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid attendance data" });
    }
  });

  // Delete attendance record
  app.delete("/api/attendance/:recordId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const recordId = req.params.recordId;
      const success = await storage.deleteAttendanceRecord(recordId);
      if (success) {
        res.json({ success: true, message: "Attendance record deleted successfully" });
      } else {
        res.status(404).json({ error: "Attendance record not found" });
      }
    } catch (error) {
      console.error('Delete attendance record error:', error);
      res.status(500).json({ error: "Failed to delete attendance record" });
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

  // Get attendance history with date range and filters
  app.get("/api/attendance/history", async (req, res) => {
    try {
      const { startDate, endDate, memberId, gender, ageGroup, isCurrentMember } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      const filters: any = {};
      if (memberId) filters.memberId = memberId as string;
      if (gender) filters.gender = gender as string;
      if (ageGroup) filters.ageGroup = ageGroup as string;
      if (isCurrentMember !== undefined) filters.isCurrentMember = isCurrentMember === 'true';

      const history = await storage.getAttendanceHistory(
        startDate as string,
        endDate as string,
        filters
      );
      
      res.json(history);
    } catch (error) {
      console.error('Attendance history error:', error);
      res.status(500).json({ error: "Failed to fetch attendance history" });
    }
  });

  // Get attendance date range (earliest and latest dates)
  app.get("/api/attendance/date-range", async (req, res) => {
    try {
      const dateRange = await storage.getAttendanceDateRange();
      res.json(dateRange);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance date range" });
    }
  });

  // Get attendance statistics for date range
  app.get("/api/attendance/stats-range", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      const stats = await storage.getAttendanceStatsByDateRange(
        startDate as string,
        endDate as string
      );
      
      res.json(stats);
    } catch (error) {
      console.error('Attendance stats range error:', error);
      res.status(500).json({ error: "Failed to fetch attendance statistics" });
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

  // Specific route must come before parameterized route
  app.post("/api/follow-up/update-absences", async (req, res) => {
    try {
      await storage.updateConsecutiveAbsences();
      res.json({ success: true });
    } catch (error) {
      console.error('Update absences error:', error);
      res.status(500).json({ error: "Failed to update absence records" });
    }
  });

  app.post("/api/follow-up/:memberId", async (req, res) => {
    try {
      const { method } = req.body; // "sms" or "email"
      
      // Get member details for notifications
      const member = await storage.getMember(req.params.memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Update follow-up record
      await storage.updateFollowUpRecord({
        churchId: member.churchId,
        memberId: req.params.memberId,
        lastContactDate: new Date(),
        contactMethod: method,
        needsFollowUp: false,
      });

      // Send notification
      try {
        const { sendFollowUpEmail, sendFollowUpSMS } = await import('./notifications');
        
        if (method === 'email') {
          await sendFollowUpEmail(member, method);
        } else if (method === 'sms') {
          await sendFollowUpSMS(member, method);
        }
      } catch (notificationError) {
        console.error('Notification failed:', notificationError);
        // Don't fail the whole request if notification fails
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Follow-up update error:', error);
      res.status(500).json({ error: "Failed to update follow-up record" });
    }
  });

  // Get children for a specific parent
  app.get("/api/members/children/:parentId", async (req, res) => {
    try {
      const children = await storage.getMembersByParent(req.params.parentId);
      res.json(children);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch children" });
    }
  });

  // Selective family check-in route
  app.post("/api/attendance/selective-family-checkin", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { parentId, childrenIds } = req.body;
      const today = new Date().toISOString().split('T')[0];
      
      // Get parent
      const parent = await storage.getMember(parentId);
      if (!parent) {
        return res.status(404).json({ error: "Parent not found" });
      }

      // Check in parent
      await storage.createAttendanceRecord({
        churchId: req.churchId || req.user?.churchId || parent.churchId,
        memberId: parentId,
        attendanceDate: today,
        checkInMethod: "family",
        isGuest: false,
      });

      // Check in selected children
      const childRecords = [];
      const checkedInChildren = [];
      
      for (const childId of childrenIds) {
        const child = await storage.getMember(childId);
        if (child) {
          const childRecord = await storage.createAttendanceRecord({
            churchId: req.churchId || req.user?.churchId || child.churchId,
            memberId: childId,
            attendanceDate: today,
            checkInMethod: "family",
            isGuest: false,
          });
          childRecords.push(childRecord);
          checkedInChildren.push(child);
        }
      }

      res.json({ 
        parent,
        children: checkedInChildren,
        attendanceRecords: childRecords.length + 1,
        success: true 
      });
    } catch (error) {
      res.status(500).json({ error: "Family check-in failed" });
    }
  });

  // Original family check-in route (for backward compatibility)
  app.post("/api/attendance/family-checkin", authenticateToken, async (req: AuthenticatedRequest, res) => {
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
        churchId: req.churchId || req.user?.churchId || parent.churchId,
        memberId: parentId,
        attendanceDate: today,
        checkInMethod: "family",
        isGuest: false,
      });

      // Check in all children
      const childRecords = [];
      for (const child of children) {
        const childRecord = await storage.createAttendanceRecord({
          churchId: req.churchId || req.user?.churchId || child.churchId,
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

  // Fix visitor-to-member attendance records
  app.post("/api/attendance/fix-visitor-member-records", async (req, res) => {
    try {
      // Find all visitors who became members (same name)
      const visitors = await storage.getAllVisitors("");
      const members = await storage.getAllMembers("");
      
      let updatedCount = 0;
      
      for (const visitor of visitors) {
        // Split visitor name into first and last name to match with member records
        const nameParts = visitor.name ? visitor.name.trim().split(' ') : [];
        const visitorFirstName = nameParts[0] || '';
        const visitorSurname = nameParts.slice(1).join(' ') || '';
        
        // Find matching member by name
        const matchingMember = members.find(member => 
          member.firstName.toLowerCase() === visitorFirstName.toLowerCase() && 
          member.surname.toLowerCase() === visitorSurname.toLowerCase()
        );
        
        if (matchingMember) {
          // Update attendance records from visitor to member
          const updated = await storage.updateVisitorAttendanceToMember(visitor.id, matchingMember.id);
          if (updated) updatedCount++;
        }
      }
      
      res.json({ 
        success: true, 
        message: `Updated ${updatedCount} attendance records from visitor to member status`,
        updatedCount
      });
    } catch (error) {
      console.error('Fix attendance records error:', error);
      res.status(500).json({ error: "Failed to fix attendance records" });
    }
  });

  // Export data route
  app.get("/api/export/members", async (req, res) => {
    try {
      const members = await storage.getAllMembers();
      
      // Convert to CSV format with full member details
      const csvHeader = "Member Name,Title,Gender,Age Group,Phone,Email,WhatsApp Number,Address,Date of Birth,Wedding Anniversary,Current Member,Fingerprint ID,Parent ID,Created At,Updated At\n";
      const csvData = members.map(member => {
        const memberName = `${member.firstName} ${member.surname}`;
        const dateOfBirth = member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '';
        const weddingAnniversary = member.weddingAnniversary ? new Date(member.weddingAnniversary).toISOString().split('T')[0] : '';
        const createdAt = member.createdAt ? new Date(member.createdAt).toISOString().replace('T', ' ').replace('Z', '') : '';
        const updatedAt = member.updatedAt ? new Date(member.updatedAt).toISOString().replace('T', ' ').replace('Z', '') : '';
        
        return `"${memberName}","${member.title || ''}","${member.gender}","${member.ageGroup}","${member.phone || ''}","${member.email || ''}","${member.whatsappNumber || ''}","${member.address || ''}","${dateOfBirth}","${weddingAnniversary}","${member.isCurrentMember}","${member.fingerprintId || ''}","${member.parentId || ''}","${createdAt}","${updatedAt}"`;
      }).join('\n');
      
      const date = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="church_members_full_${date}.csv"`);
      res.send(csvHeader + csvData);
    } catch (error) {
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.get("/api/export/attendance", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // Use date range if provided, otherwise use today
      const start = startDate as string || new Date().toISOString().split('T')[0];
      const end = endDate as string || new Date().toISOString().split('T')[0];
      
      const attendance = await storage.getAttendanceHistory(start, end);
      
      const csvHeader = "No.,Member Name,Gender,Age Group,Attendance Date,Check-in Time,Method,Type,Phone,Email\n";
      const csvData = attendance.map((record, index) => {
        const memberName = record.member 
          ? `${record.member.firstName} ${record.member.surname}` 
          : (record.visitorId ? 'Visitor' : 'Unknown');
        const checkInTime = new Date(record.checkInTime).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        });
        const recordType = record.isVisitor ? 'Visitor' : 'Member';
        const phone = record.member?.phone || '';
        const email = record.member?.email || '';
        const gender = record.member?.gender || '';
        const ageGroup = record.member?.ageGroup || '';
        
        return `"${index + 1}","${memberName}","${gender}","${ageGroup}","${record.attendanceDate}","${checkInTime}","${record.checkInMethod}","${recordType}","${phone}","${email}"`;
      }).join('\n');
      
      const dateRange = start === end ? start : `${start}_to_${end}`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance_history_${dateRange}.csv"`);
      res.send(csvHeader + csvData);
    } catch (error) {
      console.error('Attendance export error:', error);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Export monthly report
  app.get("/api/export/monthly-report", async (req, res) => {
    try {
      const { month, year } = req.query;
      
      // Use current month/year if not provided
      const currentDate = new Date();
      const reportMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
      const reportYear = year ? parseInt(year as string) : currentDate.getFullYear();
      
      // Calculate start and end dates for the month
      const startDate = `${reportYear}-${reportMonth.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(reportYear, reportMonth, 0).getDate();
      const endDate = `${reportYear}-${reportMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      
      // Get monthly statistics
      const monthlyStats = await storage.getAttendanceStatsForRange(startDate, endDate);
      const weeklyAttendance = await storage.getWeeklyAttendanceSummary(startDate, endDate);
      const newMembers = await storage.getNewMembersReport(startDate, endDate);
      const attendanceHistory = await storage.getAttendanceHistory(startDate, endDate);
      
      // Create comprehensive monthly report CSV
      const monthName = new Date(reportYear, reportMonth - 1).toLocaleDateString('en-US', { month: 'long' });
      const reportTitle = `Monthly Report - ${monthName} ${reportYear}`;
      
      let csvContent = `${reportTitle}\n\n`;
      
      // Monthly Summary
      csvContent += "MONTHLY SUMMARY\n";
      csvContent += `Total Days with Services,${monthlyStats.totalDays}\n`;
      csvContent += `Total Attendance,${monthlyStats.totalAttendance}\n`;
      csvContent += `Average Daily Attendance,${monthlyStats.averageAttendance}\n`;
      csvContent += `Total Members,${monthlyStats.totalMembers}\n`;
      csvContent += `Total Visitors,${monthlyStats.totalVisitors}\n`;
      csvContent += `Male Attendance,${monthlyStats.maleCount}\n`;
      csvContent += `Female Attendance,${monthlyStats.femaleCount}\n`;
      csvContent += `Children,${monthlyStats.childCount}\n`;
      csvContent += `Adolescents,${monthlyStats.adolescentCount}\n`;
      csvContent += `Adults,${monthlyStats.adultCount}\n\n`;
      
      // New Members This Month
      csvContent += "NEW MEMBERS THIS MONTH\n";
      if (newMembers.length > 0) {
        csvContent += "Name,Gender,Age Group,Phone,Email,Registration Date\n";
        newMembers.forEach((member: any) => {
          csvContent += `"${member.memberName}","${member.gender}","${member.ageGroup}","${member.phone || ''}","${member.email || ''}","${member.createdAt}"\n`;
        });
      } else {
        csvContent += "No new members this month\n";
      }
      csvContent += "\n";
      
      // Weekly Breakdown
      csvContent += "WEEKLY ATTENDANCE BREAKDOWN\n";
      csvContent += "Date,Gender,Age Group,Count\n";
      weeklyAttendance.forEach((record: any) => {
        csvContent += `"${record.date}","${record.gender}","${record.ageGroup}","${record.count}"\n`;
      });
      
      const filename = `monthly_report_${reportYear}_${reportMonth.toString().padStart(2, '0')}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Monthly report export error:', error);
      res.status(500).json({ error: "Monthly report export failed" });
    }
  });

  // Church user routes (new multi-tenant system)
  app.post("/api/admin/users", authenticateToken, requireRole(['admin']), ensureChurchContext, async (req: AuthenticatedRequest, res) => {
    try {
      // Create church user creation schema based on form data
      const churchUserData = z.object({
        username: z.string().min(1, "Username is required"),
        fullName: z.string().min(1, "Full name is required"),
        email: z.string().email("Invalid email format"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        role: z.enum(['admin', 'volunteer', 'data_viewer']),
        isActive: z.boolean().default(true)
      }).parse(req.body);

      // Check if email already exists for this church
      const existingUser = await churchStorage.getChurchUserByEmail(churchUserData.email);
      if (existingUser && existingUser.churchId === req.churchId) {
        return res.status(400).json({ error: "Email already exists for this church" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(churchUserData.password);
      const user = await churchStorage.createChurchUser({
        churchId: req.churchId!,
        email: churchUserData.email,
        passwordHash,
        firstName: churchUserData.fullName.split(' ')[0] || churchUserData.fullName,
        lastName: churchUserData.fullName.split(' ').slice(1).join(' ') || '',
        role: churchUserData.role,
        isActive: churchUserData.isActive
      });

      // Convert to admin user format for compatibility
      const adminUserFormat = {
        id: user.id,
        username: churchUserData.username,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      res.json(adminUserFormat);
    } catch (error) {
      console.error('Create church user error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid user data" });
    }
  });

  app.get("/api/admin/users", authenticateToken, ensureChurchContext, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await churchStorage.getChurchUsers(req.churchId!);
      
      // Convert to admin user format for compatibility with frontend
      const adminUserFormat = users.map(user => ({
        id: user.id,
        username: user.email.split('@')[0], // Use email prefix as username
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      res.json(adminUserFormat);
    } catch (error) {
      console.error('Fetch church users error:', error);
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  });

  app.get("/api/admin/users/:id", authenticateToken, ensureChurchContext, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await churchStorage.getChurchUsers(req.churchId!);
      const user = users.find(u => u.id === req.params.id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Convert to admin user format
      const adminUserFormat = {
        id: user.id,
        username: user.email.split('@')[0],
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      res.json(adminUserFormat);
    } catch (error) {
      console.error('Fetch church user error:', error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.put("/api/admin/users/:id", authenticateToken, requireRole(['admin']), ensureChurchContext, async (req: AuthenticatedRequest, res) => {
    try {
      const updateData = z.object({
        username: z.string().optional(),
        fullName: z.string().optional(),
        email: z.string().email().optional(),
        password: z.string().optional(),
        role: z.enum(['admin', 'volunteer', 'data_viewer']).optional(),
        isActive: z.boolean().optional()
      }).parse(req.body);

      const updatePayload: any = {};
      
      if (updateData.email) updatePayload.email = updateData.email;
      if (updateData.fullName) {
        const nameParts = updateData.fullName.split(' ');
        updatePayload.firstName = nameParts[0] || updateData.fullName;
        updatePayload.lastName = nameParts.slice(1).join(' ') || '';
      }
      if (updateData.password) updatePayload.passwordHash = await hashPassword(updateData.password);
      if (updateData.role) updatePayload.role = updateData.role;
      if (updateData.isActive !== undefined) updatePayload.isActive = updateData.isActive;

      const user = await churchStorage.updateChurchUser(req.params.id, updatePayload);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Convert to admin user format
      const adminUserFormat = {
        id: user.id,
        username: user.email.split('@')[0],
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      res.json(adminUserFormat);
    } catch (error) {
      console.error('Update church user error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid user data" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, requireRole(['admin']), ensureChurchContext, async (req: AuthenticatedRequest, res) => {
    try {
      // Prevent users from deleting themselves
      if (req.user?.id === req.params.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      const success = await churchStorage.deleteChurchUser(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error('Delete church user error:', error);
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

  // Export routes
  app.get("/api/export/members", async (req, res) => {
    try {
      const members = await storage.getAllMembers();
      
      // Convert to CSV format
      const headers = [
        'ID', 'Title', 'First Name', 'Surname', 'Gender', 'Age Group', 
        'Phone', 'Email', 'WhatsApp', 'Address', 'Date of Birth', 
        'Wedding Anniversary', 'Current Member', 'Fingerprint ID', 
        'Parent ID', 'Created At', 'Updated At'
      ];
      
      const csvRows = [headers.join(',')];
      
      members.forEach(member => {
        const row = [
          member.id,
          `"${member.title || ''}"`,
          `"${member.firstName}"`,
          `"${member.surname}"`,
          member.gender,
          member.ageGroup,
          `"${member.phone || ''}"`,
          `"${member.email || ''}"`,
          `"${member.whatsappNumber || ''}"`,
          `"${member.address || ''}"`,
          member.dateOfBirth || '',
          member.weddingAnniversary || '',
          member.isCurrentMember,
          `"${member.fingerprintId || ''}"`,
          `"${member.parentId || ''}"`,
          member.createdAt,
          member.updatedAt
        ];
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');
      const date = new Date().toISOString().split('T')[0];
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="members_export_${date}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export members" });
    }
  });

  app.get("/api/export/visitors", async (req, res) => {
    try {
      const visitors = await storage.getAllVisitors("");
      
      // Convert to CSV format
      const headers = [
        'ID', 'Member ID', 'Name', 'Gender', 'Age Group', 'Address', 
        'Email', 'Phone', 'WhatsApp', 'Wedding Anniversary', 'Birthday',
        'Prayer Points', 'How Heard About Us', 'Comments', 'Visit Date',
        'Follow-up Status', 'Assigned To', 'Created At', 'Updated At'
      ];
      
      const csvRows = [headers.join(',')];
      
      visitors.forEach(visitor => {
        const row = [
          visitor.id,
          `"${visitor.memberId || ''}"`,
          `"${visitor.name}"`,
          visitor.gender || '',
          visitor.ageGroup || '',
          `"${visitor.address || ''}"`,
          `"${visitor.email || ''}"`,
          `"${visitor.phone || ''}"`,
          `"${visitor.whatsappNumber || ''}"`,
          visitor.weddingAnniversary || '',
          visitor.birthday || '',
          `"${visitor.prayerPoints || ''}"`,
          `"${visitor.howDidYouHearAboutUs || ''}"`,
          `"${visitor.comments || ''}"`,
          visitor.visitDate,
          visitor.followUpStatus,
          `"${visitor.assignedTo || ''}"`,
          visitor.createdAt,
          visitor.updatedAt
        ];
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');
      const date = new Date().toISOString().split('T')[0];
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="visitors_export_${date}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export visitors" });
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

  // Visitor check-in route - creates visitor record AND attendance record  
  app.post("/api/visitor-checkin", authenticateToken, ensureChurchContext, async (req: AuthenticatedRequest, res) => {
    try {
      // Add churchId to visitor data
      const visitorDataWithChurch = {
        ...req.body,
        churchId: req.churchId
      };
      
      // Use a server-side schema that includes churchId for validation
      const serverVisitorSchema = insertVisitorSchema.extend({
        churchId: z.string()
      });
      const visitorData = serverVisitorSchema.parse(visitorDataWithChurch);
      
      // Create visitor record
      const visitor = await storage.createVisitor(visitorData);
      
      // Create attendance record for the visitor
      const today = new Date().toISOString().split('T')[0];
      const attendanceRecord = await storage.createAttendanceRecord({
        churchId: req.churchId!,
        visitorId: visitor.id,
        attendanceDate: today,
        checkInMethod: "visitor",
        isGuest: true,
        visitorName: visitor.name,
        visitorGender: visitor.gender as "male" | "female",
        visitorAgeGroup: visitor.ageGroup as "child" | "adolescent" | "adult",
      });
      
      res.json({ visitor, attendanceRecord });
    } catch (error) {
      console.error('Visitor check-in error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid visitor data" });
    }
  });

  app.get("/api/visitors", authenticateToken, ensureChurchContext, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.query;
      let visitors;
      
      if (status) {
        visitors = await storage.getVisitorsByStatus(status as string, req.churchId!);
      } else {
        visitors = await storage.getAllVisitors(req.churchId!);
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

  // Church routes for multi-tenant functionality
  app.use('/api/churches', churchRoutes);
  
  // Subscription management routes
  app.use('/api/subscriptions', subscriptionRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
