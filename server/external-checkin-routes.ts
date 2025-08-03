import express from 'express';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { DatabaseStorage } from './storage.js';
import { events, attendanceRecords, members, churches } from '@shared/schema';
import { enableExternalCheckInSchema, externalCheckInAttemptSchema } from '@shared/schema';
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

// Enable/disable external check-in for an event (Admin only)
router.post('/events/:eventId/external-checkin/toggle', authenticateToken, ensureChurchContext, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId } = req.params;
    const { enabled } = enableExternalCheckInSchema.parse(req.body);

    // Verify event belongs to this church
    const event = await db.select().from(events).where(
      and(eq(events.id, eventId), eq(events.churchId, req.churchId!))
    ).limit(1);

    if (event.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    let updateData: any = { externalCheckInEnabled: enabled };

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

    const updatedEvent = await db.select().from(events).where(eq(events.id, eventId)).limit(1);

    res.json({
      success: true,
      event: updatedEvent[0],
      externalUrl: enabled ? `${req.get('host')}/external-checkin/${updateData.externalCheckInUrl}` : null
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

    res.json({
      enabled: eventData.externalCheckInEnabled || false,
      url: eventData.externalCheckInUrl,
      pin: eventData.externalCheckInPin,
      fullUrl: eventData.externalCheckInUrl ? 
        `${req.get('host')}/external-checkin/${eventData.externalCheckInUrl}` : null
    });
  } catch (error) {
    console.error('Get external check-in error:', error);
    res.status(500).json({ error: 'Failed to get external check-in details' });
  }
});

// External check-in page (public access with URL and PIN verification)
router.get('/:eventUrl', async (req, res) => {
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

// Process external check-in (PIN + member verification)
router.post('/:eventUrl/checkin', async (req, res) => {
  try {
    const { eventUrl } = req.params;
    const { pin, memberId } = externalCheckInAttemptSchema.parse(req.body);

    // Find event by external URL and verify PIN
    const event = await db.select().from(events).where(
      and(
        eq(events.externalCheckInUrl, eventUrl),
        eq(events.externalCheckInEnabled, true),
        eq(events.isActive, true),
        eq(events.externalCheckInPin, pin)
      )
    ).limit(1);

    if (event.length === 0) {
      return res.status(401).json({ error: 'Invalid PIN or check-in not available' });
    }

    const eventData = event[0];

    // Verify member belongs to this church
    const member = await db.select().from(members).where(
      and(
        eq(members.id, memberId),
        eq(members.churchId, eventData.churchId),
        eq(members.isCurrentMember, true)
      )
    ).limit(1);

    if (member.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const memberData = member[0];
    const attendanceDate = new Date().toISOString().split('T')[0];

    // Check if already checked in today for this event
    const existingAttendance = await db.select().from(attendanceRecords).where(
      and(
        eq(attendanceRecords.memberId, memberId),
        eq(attendanceRecords.eventId, eventData.id),
        eq(attendanceRecords.attendanceDate, attendanceDate)
      )
    ).limit(1);

    if (existingAttendance.length > 0) {
      return res.status(409).json({ 
        error: 'Already checked in',
        message: `${memberData.firstName} ${memberData.surname} has already checked in for ${eventData.name} today`
      });
    }

    // Create attendance record with external check-in method
    await db.insert(attendanceRecords).values({
      churchId: eventData.churchId,
      eventId: eventData.id,
      memberId: memberId,
      attendanceDate: attendanceDate,
      checkInMethod: 'external',
      checkInTime: new Date(),
    });

    res.json({
      success: true,
      message: `${memberData.firstName} ${memberData.surname} successfully checked in for ${eventData.name}`,
      member: {
        id: memberData.id,
        firstName: memberData.firstName,
        surname: memberData.surname
      },
      event: {
        id: eventData.id,
        name: eventData.name,
        type: eventData.eventType
      }
    });

  } catch (error) {
    console.error('External check-in process error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    
    res.status(500).json({ error: 'Failed to process check-in' });
  }
});

export default router;