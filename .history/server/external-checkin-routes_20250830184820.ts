// ⚠️ remove: import { DatabaseStorage } from './storage.js';
import express from 'express';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { authenticateToken, AuthenticatedRequest, ensureChurchContext, requireRole } from './auth.js';


import { sql as dsql } from 'drizzle-orm';
import { db } from './db';


const router = express.Router();

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

// ---- helpers ----
function generateExternalCheckInData() {
  const uniqueUrl = nanoid(16);
  const pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
  return { uniqueUrl, pin };
}

// --------------------------- PUBLIC ENDPOINTS ---------------------------

// GET /api/external-checkin/event/:eventUrl
router.get('/event/:eventUrl', async (req, res) => {
  try {
    const { eventUrl } = req.params;

    const [eventRow] = await db
      .select({
        id: schema.events.id,
        churchId: schema.events.churchId,
        name: schema.events.name,
        eventType: schema.events.eventType,
        location: schema.events.location,
        externalCheckInEnabled: schema.events.externalCheckInEnabled,
        isActive: schema.events.isActive,
      })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.externalCheckInUrl, eventUrl),
          eq(schema.events.externalCheckInEnabled, true),
          eq(schema.events.isActive, true),
        )
      )
      .limit(1);

    if (!eventRow) {
      return res.status(404).json({ error: 'External check-in not found or disabled' });
    }

    const [church] = await db
      .select({
        name: schema.churches.name,
        brandColor: schema.churches.brandColor,
      })
      .from(schema.churches)
      .where(eq(schema.churches.id, eventRow.churchId))
      .limit(1);

    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    return res.json({
      eventId: eventRow.id,
      eventName: eventRow.name,
      eventType: eventRow.eventType,
      location: eventRow.location,
      churchName: church.name,
      churchBrandColor: church.brandColor,
      requiresPin: true,
    });
  } catch (error: any) {
    console.error('External check-in page error:', error);
    return res.status(500).json({ error: 'Failed to load external check-in page', detail: error?.message });
  }
});

// POST /api/external-checkin/check-in/:eventUrl
router.post('/check-in/:eventUrl', async (req, res) => {
  try {
    const { eventUrl } = req.params;
    const { pin, memberId } = req.body as { pin?: string; memberId?: string };

    if (!pin || !memberId) {
      return res.status(400).json({ error: 'PIN and member ID are required' });
    }
    if (pin.length !== 6) {
      return res.status(400).json({ error: 'PIN must be exactly 6 digits' });
    }

    const [eventRow] = await db
      .select({
        id: schema.events.id,
        churchId: schema.events.churchId,
      })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.externalCheckInUrl, eventUrl),
          eq(schema.events.externalCheckInPin, pin),
          eq(schema.events.externalCheckInEnabled, true),
          eq(schema.events.isActive, true),
        )
      )
      .limit(1);

    if (!eventRow) {
      return res.status(401).json({ error: 'Invalid PIN or check-in not available' });
    }

    const [member] = await db
      .select({
        id: schema.members.id,
        firstName: schema.members.firstName,
        surname: schema.members.surname,
      })
      .from(schema.members)
      .where(and(eq(schema.members.id, memberId), eq(schema.members.churchId, eventRow.churchId)))
      .limit(1);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const [existing] = await db
      .select({ id: schema.attendanceRecords.id })
      .from(schema.attendanceRecords)
      .where(
        and(
          eq(schema.attendanceRecords.memberId, memberId),
          eq(schema.attendanceRecords.eventId, eventRow.id),
          eq(schema.attendanceRecords.attendanceDate, today),
        )
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({
        error: 'You have already checked in to this event today',
        isDuplicate: true,
      });
    }

    await db.insert(schema.attendanceRecords).values({
      churchId: eventRow.churchId,
      memberId,
      eventId: eventRow.id,
      attendanceDate: today,
      checkInMethod: 'external',
      isGuest: false,
    });

    return res.json({
      success: true,
      message: `Check-in successful for ${member.firstName} ${member.surname}`,
      member: {
        name: `${member.firstName} ${member.surname}`,
        checkInTime: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('External check-in submission error:', error);
    if (typeof error?.message === 'string' && error.message.includes('duplicate key')) {
      return res.status(409).json({
        error: 'You have already checked in to this event today',
        isDuplicate: true,
      });
    }
    return res.status(500).json({ error: 'Failed to process check-in', detail: error?.message });
  }
});

// ------------------------ AUTHENTICATED ENDPOINTS ------------------------

// POST /api/external-checkin/events/:eventId/external-checkin/toggle
router.post(
  '/events/:eventId/external-checkin/toggle',
  authenticateToken,
  ensureChurchContext,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { eventId } = req.params;
      const { enabled } = req.body as { enabled?: boolean };

      if (!eventId || !isUuid(eventId)) {
        return res.status(400).json({ error: 'Invalid eventId format; expected UUID' });
      }
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' });
      }
      if (!req.churchId) {
        return res.status(401).json({ error: 'Church context missing' });
      }

      const [eventRow] = await db
        .select({
          id: schema.events.id,
          churchId: schema.events.churchId,
          externalCheckInEnabled: schema.events.externalCheckInEnabled,
          externalCheckInUrl: schema.events.externalCheckInUrl,
          externalCheckInPin: schema.events.externalCheckInPin,
        })
        .from(schema.events)
        .where(eq(schema.events.id, eventId))
        .limit(1);

      if (!eventRow) return res.status(404).json({ error: 'Event not found' });
      if (eventRow.churchId !== req.churchId) {
        return res.status(403).json({ error: 'Event does not belong to your church' });
      }

      const updateData: Partial<typeof schema.events.$inferInsert> = {
        externalCheckInEnabled: enabled,
      };

      if (enabled) {
        const { uniqueUrl, pin } = generateExternalCheckInData();
        updateData.externalCheckInUrl = uniqueUrl;
        updateData.externalCheckInPin = pin;
      } else {
        updateData.externalCheckInUrl = null;
        updateData.externalCheckInPin = null;
      }

      await db.update(schema.events).set(updateData).where(eq(schema.events.id, eventId));

      const [updated] = await db
        .select({
          id: schema.events.id,
          churchId: schema.events.churchId,
          externalCheckInEnabled: schema.events.externalCheckInEnabled,
          externalCheckInUrl: schema.events.externalCheckInUrl,
          externalCheckInPin: schema.events.externalCheckInPin,
        })
        .from(schema.events)
        .where(eq(schema.events.id, eventId))
        .limit(1);

      if (!updated) return res.status(404).json({ error: 'Event not found after update' });

      const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
      const host = req.get('host');
      const fullUrl = updated.externalCheckInUrl
        ? `${protocol}://${host}/external-checkin/${updated.externalCheckInUrl}`
        : null;

      return res.json({
        success: true,
        event: updated,
        externalUrl: fullUrl,
        fullUrl,
      });
    } catch (error: any) {
      console.error('Toggle external check-in error:', error);
      return res.status(500).json({ error: 'Failed to toggle external check-in', detail: error?.message });
    }
  }
);

// GET /api/external-checkin/events/:eventId/external-checkin (admin view)
router.get(
  '/events/:eventId/external-checkin',
  authenticateToken,
  ensureChurchContext,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { eventId } = req.params;
      if (!isUuid(eventId)) {
        return res.status(400).json({ error: 'Invalid eventId format; expected UUID' });
      }
      if (!req.churchId) {
        return res.status(401).json({ error: 'Church context missing' });
      }

      // Raw SQL with aliases (or switch to narrow select below)
      const { rows } = await db.execute(dsql`
        SELECT
          id,
          church_id                 AS "churchId",
          external_check_in_enabled AS "externalCheckInEnabled",
          external_check_in_url     AS "externalCheckInUrl",
          external_check_in_pin     AS "externalCheckInPin"
        FROM events
        WHERE id = ${eventId}
        LIMIT 1
      `);
      const eventRow = rows[0] as {
        id: string;
        churchId: string;
        externalCheckInEnabled: boolean | null;
        externalCheckInUrl: string | null;
        externalCheckInPin: string | null;
      };

      if (!eventRow) return res.status(404).json({ error: 'Event not found' });
      if (eventRow.churchId !== req.churchId) {
        return res.status(403).json({ error: 'Event does not belong to your church' });
      }

      const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
      const host = req.get('host');
      const fullUrl = eventRow.externalCheckInUrl
        ? `${protocol}://${host}/external-checkin/${eventRow.externalCheckInUrl}`
        : null;

      return res.json({
        enabled: !!eventRow.externalCheckInEnabled,
        url: eventRow.externalCheckInUrl || null,
        pin: eventRow.externalCheckInPin || null,
        fullUrl,
      });

      // (Alternative without raw SQL)
      // const [eventRow] = await db.select({...}).from(schema.events)...
    } catch (err: any) {
      console.error('Get external check-in error:', err);
      return res.status(500).json({ error: 'Failed to get external check-in details', detail: err?.message });
    }
  }
);

// ------------------------ PUBLIC: members/search ------------------------

router.post('/members', async (req, res) => {
  try {
    const { eventUrl } = req.body as { eventUrl?: string };
    if (!eventUrl) return res.status(400).json({ error: 'Event URL is required' });

    const [eventRow] = await db
      .select({ churchId: schema.events.churchId })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.externalCheckInUrl, eventUrl),
          eq(schema.events.externalCheckInEnabled, true),
          eq(schema.events.isActive, true),
        )
      )
      .limit(1);

    if (!eventRow) return res.status(404).json({ error: 'External check-in not found or disabled' });

    const churchMembers = await db
      .select({
        id: schema.members.id,
        firstName: schema.members.firstName,
        surname: schema.members.surname,
      })
      .from(schema.members)
      .where(eq(schema.members.churchId, eventRow.churchId));

    return res.json(churchMembers);
  } catch (error: any) {
    console.error('Get external check-in members error:', error);
    return res.status(500).json({ error: 'Failed to load members', detail: error?.message });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { eventUrl, search } = req.body as { eventUrl?: string; search?: string };
    if (!eventUrl) return res.status(400).json({ error: 'Event URL is required' });
    if (!search || search.trim().length === 0) return res.json([]);

    const [eventRow] = await db
      .select({ churchId: schema.events.churchId })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.externalCheckInUrl, eventUrl),
          eq(schema.events.externalCheckInEnabled, true),
          eq(schema.events.isActive, true),
        )
      )
      .limit(1);

    if (!eventRow) return res.status(404).json({ error: 'External check-in not found or disabled' });

    const allMembers = await db
      .select({
        id: schema.members.id,
        firstName: schema.members.firstName,
        surname: schema.members.surname,
        gender: schema.members.gender,
        ageGroup: schema.members.ageGroup,
        phone: schema.members.phone,
        email: schema.members.email,
        parentId: schema.members.parentId,
      })
      .from(schema.members)
      .where(and(eq(schema.members.churchId, eventRow.churchId), eq(schema.members.isCurrentMember, true)));

    const term = search.toLowerCase().trim();
    const filtered = allMembers.filter(m =>
      m.firstName.toLowerCase().includes(term) ||
      m.surname.toLowerCase().includes(term) ||
      (m.phone && m.phone.includes(term)) ||
      (m.email && m.email.toLowerCase().includes(term))
    );

    const withChildren = filtered.map(m => {
      const children = allMembers.filter(c => c.parentId === m.id);
      return {
        id: m.id,
        firstName: m.firstName,
        surname: m.surname,
        gender: m.gender,
        ageGroup: m.ageGroup,
        phone: m.phone,
        email: m.email,
        parentId: m.parentId,
        children: children.map(c => ({
          id: c.id,
          firstName: c.firstName,
          surname: c.surname,
          gender: c.gender,
          ageGroup: c.ageGroup,
          parentId: c.parentId,
        })),
      };
    });

    return res.json(withChildren);
  } catch (error: any) {
    console.error('External check-in search error:', error);
    return res.status(500).json({ error: 'Failed to search members', detail: error?.message });
  }
});

export default router;
