import express from 'express';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { DatabaseStorage } from './storage.js';
import { events, attendanceRecords, members, churches } from '@shared/schema';
// Remove schema imports for now - we'll handle validation manually
import { authenticateToken, AuthenticatedRequest, ensureChurchContext, requireRole } from './auth.js';

// Import db directly from neon connection
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const router = express.Router();

// Generate a unique URL and PIN for external check-in
function generateExternalCheckInData() {
  const uniqueUrl = nanoid(16); // 16-character unique identifier
  const pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
  return { uniqueUrl, pin };
}

// PUBLIC API ROUTES (no authentication required)
// Get event data for external check-in page
router.get('/event/:eventUrl', async (req, res) => {
  try {
    const { eventUrl } = req.params;

    // Find event by external URL
    const event = await db.select().from(events).where(
      and(
        eq(events.externalCheckInUrl, eventUrl),
        eq(events.externalCheckInEnabled, true),
        eq(events.isActive, true)
      )
    ).limit(1);

    if (event.length === 0) {
      return res.status(404).json({ error: 'External check-in not found or disabled' });
    }

    const eventData = event[0];

    // Get church information
    const church = await db.select().from(churches).where(eq(churches.id, eventData.churchId)).limit(1);

    if (church.length === 0) {
      return res.status(404).json({ error: 'Church not found' });
    }

    res.json({
      eventId: eventData.id,
      eventName: eventData.name,
      eventType: eventData.eventType,
      location: eventData.location,
      churchName: church[0].name,
      churchBrandColor: church[0].brandColor,
      requiresPin: true
    });
  } catch (error) {
    console.error('External check-in page error:', error);
    res.status(500).json({ error: 'Failed to load external check-in page' });
  }
});

// Public external check-in submission (PIN + member ID required)
router.post('/checkin/:eventUrl', async (req, res) => {
  try {
    const { eventUrl } = req.params;
    const { pin, memberId } = req.body;

    // Validate inputs
    if (!pin || !memberId) {
      return res.status(400).json({ error: 'PIN and member ID are required' });
    }

    if (pin.length !== 6) {
      return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
    }

    // Find event by external URL and PIN
    const event = await db.select().from(events).where(
      and(
        eq(events.externalCheckInUrl, eventUrl),
        eq(events.externalCheckInPin, pin),
        eq(events.externalCheckInEnabled, true),
        eq(events.isActive, true)
      )
    ).limit(1);

    if (event.length === 0) {
      return res.status(401).json({ error: 'Invalid PIN or check-in not available' });
    }

    const eventData = event[0];

    // Verify member exists and belongs to the same church
    const member = await db.select().from(members).where(
      and(
        eq(members.id, memberId),
        eq(members.churchId, eventData.churchId)
      )
    ).limit(1);

    if (member.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const memberData = member[0];

    // Check for existing attendance today for this event
    const today = new Date().toISOString().split('T')[0];
    const existingAttendance = await db.select().from(attendanceRecords).where(
      and(
        eq(attendanceRecords.memberId, memberId),
        eq(attendanceRecords.eventId, eventData.id),
        eq(attendanceRecords.attendanceDate, today)
      )
    ).limit(1);

    if (existingAttendance.length > 0) {
      return res.status(409).json({ 
        error: 'You have already checked in to this event today',
        isDuplicate: true 
      });
    }

    // Create attendance record
    const attendanceRecord = {
      churchId: eventData.churchId,
      memberId: memberId,
      eventId: eventData.id,
      attendanceDate: today,
      checkInMethod: 'external' as const,
      isGuest: false,
    };

    await db.insert(attendanceRecords).values(attendanceRecord);

    res.json({
      success: true,
      message: `Check-in successful for ${memberData.firstName} ${memberData.surname}`,
      member: {
        name: `${memberData.firstName} ${memberData.surname}`,
        checkInTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('External check-in submission error:', error);
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({ 
        error: 'You have already checked in to this event today',
        isDuplicate: true 
      });
    }
    
    res.status(500).json({ error: 'Failed to process check-in' });
  }
});

// AUTHENTICATED ROUTES
// Enable/disable external check-in for an event (Admin only)
router.post('/events/:eventId/external-checkin/toggle', authenticateToken, ensureChurchContext, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId } = req.params;
    const { enabled } = req.body;
    
    // Validate enabled parameter
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    if (!req.churchId) {
        return res.status(401).json({ error: "Church context missing" });
      }
    const [eventRow] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);

      if (!eventRow) {
        return res.status(404).json({ error: "Event not found" });
      }
      if (eventRow.churchId !== req.churchId) {
        return res.status(403).json({ error: "Event does not belong to your church" });
      }



    // Verify event belongs to this church
    // const event = await db.select().from(events).where(
    //   and(eq(events.id, eventId), eq(events.churchId, req.churchId!))
    // ).limit(1);

    // if (event.length === 0) {
    //   return res.status(404).json({ error: 'Event not found' });
    // }

    // let updateData: any = { externalCheckInEnabled: enabled };


    const updateData: any = { externalCheckInEnabled: enabled, updatedAt: new Date() };


    if (enabled) {
      // Generate new URL and PIN when enabling
      const { uniqueUrl, pin } = generateExternalCheckInData();
      updateData.externalCheckInUrl = uniqueUrl;
      updateData.externalCheckInPin = pin;
    } else {
      // Clear URL and PIN when disabling
      updateData.externalCheckInUrl = null;
      updateData.externalCheckInPin = null;
    }

    await db.update(events)
      .set(updateData)
      .where(eq(events.id, eventId));

    // const updatedEvent = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    const [updated] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);


    const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    const host = req.get('host');
    
    res.json({
      success: true,
      event: updatedEvent[0],
      externalUrl: enabled ? `${protocol}://${host}/external-checkin/${updateData.externalCheckInUrl}` : null
    });
  } catch (error) {
    console.error('Toggle external check-in error:', error);
    res.status(500).json({ error: 'Failed to toggle external check-in' });
  }
});

// Get external check-in details for admin
router.get('/events/:eventId/external-checkin', authenticateToken, ensureChurchContext, async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId } = req.params;

    // Verify event belongs to this church
    const event = await db.select().from(events).where(
      and(eq(events.id, eventId), eq(events.churchId, req.churchId!))
    ).limit(1);

    if (event.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = event[0];

    const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
    const host = req.get('host');
    
    res.json({
      enabled: eventData.externalCheckInEnabled || false,
      url: eventData.externalCheckInUrl,
      pin: eventData.externalCheckInPin,
      fullUrl: eventData.externalCheckInUrl ? 
        `${protocol}://${host}/external-checkin/${eventData.externalCheckInUrl}` : null
    });
  } catch (error) {
    console.error('Get external check-in error:', error);
    res.status(500).json({ error: 'Failed to get external check-in details' });
  }
});

// Get members for external check-in (public endpoint with eventUrl verification)
router.post('/members', async (req, res) => {
  try {
    const { eventUrl } = req.body;

    if (!eventUrl) {
      return res.status(400).json({ error: 'Event URL is required' });
    } 

    // Find event by external URL to get church ID
    const event = await db.select().from(events).where(
      and(
        eq(events.externalCheckInUrl, eventUrl),
        eq(events.externalCheckInEnabled, true),
        eq(events.isActive, true)
      )
    ).limit(1);

    if (event.length === 0) {
      return res.status(404).json({ error: 'External check-in not found or disabled' });
    }

    const eventData = event[0];

    // Get all members for this church
    const churchMembers = await db.select({
      id: members.id,
      firstName: members.firstName,
      surname: members.surname,
    }).from(members).where(eq(members.churchId, eventData.churchId));

    res.json(churchMembers);
  } catch (error) {
    console.error('Get external check-in members error:', error);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

// Search members for external check-in with family data
router.post('/search', async (req, res) => {
  try {
    const { eventUrl, search } = req.body;

    if (!eventUrl) {
      return res.status(400).json({ error: 'Event URL is required' });
    }

    if (!search || search.trim().length === 0) {
      return res.json([]);
    }

    // Find event by external URL to get church ID
    const event = await db.select().from(events).where(
      and(
        eq(events.externalCheckInUrl, eventUrl),
        eq(events.externalCheckInEnabled, true),
        eq(events.isActive, true)
      )
    ).limit(1);

    if (event.length === 0) {
      return res.status(404).json({ error: 'External check-in not found or disabled' });
    }

    const eventData = event[0];
    const searchTerm = search.toLowerCase().trim();

    // Get all members for this church with search filtering
    const allMembers = await db.select().from(members).where(
      and(
        eq(members.churchId, eventData.churchId),
        eq(members.isCurrentMember, true)
      )
    );

    // Filter members by search term (name, phone, email)
    const filteredMembers = allMembers.filter(member => 
      member.firstName.toLowerCase().includes(searchTerm) ||
      member.surname.toLowerCase().includes(searchTerm) ||
      (member.phone && member.phone.includes(searchTerm)) ||
      (member.email && member.email.toLowerCase().includes(searchTerm))
    );

    // Build response with children for family check-ins
    const membersWithChildren = filteredMembers.map(member => {
      // Find children (members with this member as parent)
      const children = allMembers.filter(child => child.parentId === member.id);
      
      return {
        id: member.id,
        firstName: member.firstName,
        surname: member.surname,
        gender: member.gender,
        ageGroup: member.ageGroup,
        phone: member.phone,
        email: member.email,
        parentId: member.parentId,
        children: children.map(child => ({
          id: child.id,
          firstName: child.firstName,
          surname: child.surname,
          gender: child.gender,
          ageGroup: child.ageGroup,
          parentId: child.parentId
        }))
      };
    });

    res.json(membersWithChildren);
  } catch (error) {
    console.error('External check-in search error:', error);
    res.status(500).json({ error: 'Failed to search members' });
  }
});

export default router;