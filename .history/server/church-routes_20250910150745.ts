import { Router } from 'express';
import { z } from 'zod';
import { churchStorage } from './church-storage.js';
import { 
  generateToken, 
  hashPassword, 
  verifyPassword, 
  generateSubdomain,
  authenticateToken,
  requireRole,
  ensureChurchContext,
  type AuthenticatedRequest 
} from './auth.js';
import { eq } from "drizzle-orm";
import { db } from "./db.js";
import { insertChurchSchema, insertChurchUserSchema, kioskSettingsSchema, events } from '../shared/schema.js';
import { generateKioskToken, type ChurchUserPayload } from './auth.js';

const router = Router();

// Church registration schema
const churchRegistrationSchema = z.object({
  churchName: z.string().min(1, "Church name is required"),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
  adminEmail: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  subdomain: z.string().min(3, "Subdomain must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens").optional(),
});

// Church login schema
const churchLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
const normalizeSubdomain = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);



// POST /api/churches/register - Register new church with admin user
router.post('/register', async (req, res) => {
  const errorId = Math.random().toString(36).slice(2, 10);

  try {
    const registrationData = churchRegistrationSchema.parse(req.body);

    // email duplicate (nice UX)
    const existingUser = await churchStorage.getChurchUserByEmail(registrationData.adminEmail.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered', code: 'EMAIL_TAKEN' });
    }
const wanted = (registrationData.subdomain || generateSubdomain(registrationData.churchName)).toLowerCase();
    const base = wanted || `org-${Date.now()}`;

    let subdomain = base;
    let i = 1;
    while (!(await churchStorage.isSubdomainAvailable(subdomain))) {
      subdomain = `${base}-${i++}`;
      if (i > 50) throw new Error('Could not find available subdomain');
    }


    // Generate subdomain if not provided
    // let subdomain = registrationData.subdomain || generateSubdomain(registrationData.churchName);
    
    // Ensure subdomain is unique
    // let counter = 1;
    // let originalSubdomain = subdomain;
    // while (!(await churchStorage.isSubdomainAvailable(subdomain))) {
    //   subdomain = `${originalSubdomain}-${counter}`;
    //   counter++;
    // }



    



    // Create church
    const church = await churchStorage.createChurch({
      name: registrationData.churchName,
      subdomain,
      subscriptionTier: 'trial',
      maxMembers: 999999, // Unlimited during trial
      kioskModeEnabled: false,
      kioskSessionTimeout: 60,
    });

    // Hash password and create admin user
    const passwordHash = await hashPassword(registrationData.password);
    let adminUser;
    try {
      adminUser = await churchStorage.createChurchUser({
        churchId: church.id,
        email: registrationData.adminEmail.toLowerCase(),
        passwordHash,
        firstName: registrationData.adminFirstName,
        lastName: registrationData.adminLastName,
        role: 'admin',
        isActive: true,
      });
    } catch (e: any) {
      try { await churchStorage.deleteChurchById?.(church.id); } catch {}
      // translate PG unique violation if bubbled up
      if (e?.code === '23505') {
        const isEmail = /email/i.test(e?.detail || '') || /email/i.test(e?.constraint || '');
        return res.status(409).json({
          error: isEmail ? 'Email already registered' : 'Duplicate value',
          code: isEmail ? 'EMAIL_TAKEN' : 'UNIQUE_VIOLATION',
        });
      }
      throw e;
    }


    // Generate JWT token
    const token = generateToken({
      id: adminUser.id,
      churchId: church.id,
      email: adminUser.email,
      role: adminUser.role,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
    });

   return  res.status(201).json({
      success: true,
      church: {
        id: church.id,
        name: church.name,
        subdomain: church.subdomain,
        subscriptionTier: church.subscriptionTier,
        trialEndDate: church.trialEndDate,
      },
      user: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role,
      },
      token,
    });
  } 
    catch (error: any) {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error?.code === '23505') {
      const isSub = /subdomain/i.test(error?.detail || '') || /subdomain/i.test(error?.constraint || '');
      return res.status(409).json({
        error: isSub ? 'Subdomain already in use' : 'Duplicate value',
        code: isSub ? 'SUBDOMAIN_TAKEN' : 'UNIQUE_VIOLATION',
      });
    }
    console.error(`[register][${errorId}]`, error);
    return res.status(500).json({ error: 'Internal server error', errorId });
  }
});

// POST /api/churches/login - Church user login
router.post('/login', async (req, res) => {
  try {
    const loginData = churchLoginSchema.parse(req.body);

    // Find user by email
    const user = await churchStorage.getChurchUserByEmail(loginData.email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(loginData.password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Get church details
    const church = await churchStorage.getChurchById(user.churchId);
    if (!church) {
      return res.status(500).json({ error: 'Church not found' });
    }

    // Check if church is suspended (handle both camelCase and snake_case)
    const subscriptionTier = church.subscriptionTier || (church as any).subscription_tier;
    if (subscriptionTier === 'suspended') {
      return res.status(403).json({ 
        error: 'Church account is suspended. Please contact support for assistance.',
        suspended: true 
      });
    }

    // Update last login
    await churchStorage.updateLastLogin(user.id);

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      churchId: user.churchId,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    // Check trial status
    const trialDaysRemaining = await churchStorage.getTrialDaysRemaining(church.id);
    const isTrialActive = await churchStorage.isTrialActive(church.id);

    res.json({
      success: true,
      church: {
        id: church.id,
        name: church.name,
        subdomain: church.subdomain,
        subscriptionTier: church.subscriptionTier,
        trialEndDate: church.trialEndDate,
        logoUrl: church.logoUrl,
        brandColor: church.brandColor,
        isTrialActive,
        trialDaysRemaining,
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/churches/me - Get current church and user info
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const church = await churchStorage.getChurchById(req.churchId!);
    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const trialDaysRemaining = await churchStorage.getTrialDaysRemaining(church.id);
    const isTrialActive = await churchStorage.isTrialActive(church.id);
    const memberCount = await churchStorage.getChurchMemberCount(church.id);

    res.json({
      church: {
        id: church.id,
        name: church.name,
        subdomain: church.subdomain,
        subscriptionTier: church.subscriptionTier,
        trialEndDate: church.trialEndDate,
        logoUrl: church.logoUrl,
        brandColor: church.brandColor,
        maxMembers: church.maxMembers,
        isTrialActive,
        trialDaysRemaining,
        memberCount,
      },
      user: req.user,
    });
  } catch (error) {
    console.error('Get church info error:', error);
    res.status(500).json({ error: 'Failed to get church information' });
  }
});

// PUT /api/churches/settings - Update church settings
router.put('/settings', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const updateSchema = z.object({
      name: z.string().min(1, "Church name is required").optional(),
      logoUrl: z.string().url("Invalid logo URL").optional(),
      brandColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Brand color must be a valid hex color").optional(),
    });

    const updates = updateSchema.parse(req.body);
    const church = await churchStorage.updateChurch(req.churchId!, updates);

    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    res.json({ success: true, church });
  } catch (error) {
    console.error('Update church settings error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Failed to update church settings' });
  }
});

// GET /api/churches/kiosk-settings - Get current kiosk settings
router.get('/kiosk-settings', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const church = await churchStorage.getChurchById(req.churchId!);
    
    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Calculate remaining time if session is active
    let timeRemaining = null;
    let isSessionActive = false;
    
    if (church.kioskSessionStartTime) {
      const sessionStart = new Date(church.kioskSessionStartTime);
      const sessionTimeout = church.kioskSessionTimeout || 60;
      const sessionEnd = new Date(sessionStart.getTime() + sessionTimeout * 60 * 1000);
      const now = new Date();
      
      if (now < sessionEnd) {
        timeRemaining = Math.max(0, Math.floor((sessionEnd.getTime() - now.getTime()) / 1000));
        isSessionActive = true;
      }
    }

    // Get all active events available for kiosk mode
    let availableEvents = [];
    try {
      const allEvents = await db.select().from(events).where(eq(events.churchId, req.churchId!));
      availableEvents = allEvents.filter(event => event.isActive).map(event => ({
        id: event.id,
        name: event.name,
        eventType: event.eventType,
        location: event.location
      }));
    } catch (e) {
      console.error('Error fetching active events:', e);
    }

    res.json({
      kioskModeEnabled: church.kioskModeEnabled || false,
      kioskSessionTimeout: church.kioskSessionTimeout || 60,
      activeSession: isSessionActive ? {
        timeRemaining: timeRemaining,
        isActive: true,
        availableEvents: availableEvents
      } : null
    });
  } catch (error) {
    console.error('Get kiosk settings error:', error);
    res.status(500).json({ error: 'Failed to get kiosk settings' });
  }
});

// POST /api/churches/kiosk-session/start - Start a kiosk session for all active events
router.post('/kiosk-session/start', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    // No validation needed - kiosk mode applies to all active events
    const church = await churchStorage.updateChurch(req.churchId!, {
      kioskSessionStartTime: new Date(),
    });

    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Get all active events for display
    let availableEvents = [];
    try {
      const allEvents = await db.select().from(events).where(eq(events.churchId, req.churchId!));
      availableEvents = allEvents.filter(event => event.isActive);
    } catch (e) {
      console.error('Error fetching active events:', e);
    }

    // Generate extended token for kiosk session persistence
    const userPayload: ChurchUserPayload = {
      id: req.user!.id,
      churchId: req.user!.churchId,
      email: req.user!.email,
      role: req.user!.role,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
    };
    const extendedToken = generateKioskToken(userPayload, church.kioskSessionTimeout || 60);

    res.json({ 
      success: true, 
      message: 'Kiosk session started successfully for all active events',
      session: {
        startTime: church.kioskSessionStartTime,
        timeoutMinutes: church.kioskSessionTimeout,
        availableEvents: availableEvents.length
      },
      extendedToken // Send back extended token for session persistence
    });
  } catch (error) {
    console.error('Start kiosk session error:', error);
    res.status(500).json({ error: 'Failed to start kiosk session' });
  }
});

// POST /api/churches/kiosk-session/extend - Extend current kiosk session
router.post('/kiosk-session/extend', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    // Reset session start time to extend the session
    const church = await churchStorage.updateChurch(req.churchId!, {
      kioskSessionStartTime: new Date(),
    });

    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    // Generate new extended token for session extension
    const userPayload: ChurchUserPayload = {
      id: req.user!.id,
      churchId: req.user!.churchId,
      email: req.user!.email,
      role: req.user!.role,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
    };
    const extendedToken = generateKioskToken(userPayload, church.kioskSessionTimeout || 60);

    res.json({ 
      success: true, 
      message: 'Kiosk session extended successfully',
      newStartTime: church.kioskSessionStartTime,
      extendedToken // Send back new extended token
    });
  } catch (error) {
    console.error('Extend kiosk session error:', error);
    res.status(500).json({ error: 'Failed to extend kiosk session' });
  }
});

// POST /api/churches/kiosk-session/end - End current kiosk session
router.post('/kiosk-session/end', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const church = await churchStorage.updateChurch(req.churchId!, {
      kioskSessionStartTime: null,
    });

    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    res.json({ 
      success: true, 
      message: 'Kiosk session ended successfully'
    });
  } catch (error) {
    console.error('End kiosk session error:', error);
    res.status(500).json({ error: 'Failed to end kiosk session' });
  }
});

// PATCH /api/churches/kiosk-settings - Update kiosk mode settings
router.patch('/kiosk-settings', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const settings = kioskSettingsSchema.parse(req.body);
    
    const church = await churchStorage.updateChurch(req.churchId!, {
      kioskModeEnabled: settings.kioskModeEnabled,
      kioskSessionTimeout: settings.kioskSessionTimeout,
    });

    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    res.json({ 
      success: true, 
      message: 'Kiosk settings updated successfully',
      settings: {
        kioskModeEnabled: church.kioskModeEnabled,
        kioskSessionTimeout: church.kioskSessionTimeout,
      }
    });
  } catch (error) {
    console.error('Update kiosk settings error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Failed to update kiosk settings' });
  }
});

// GET /api/churches/features - Get available features for current subscription
router.get('/features', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const churchId = req.churchId!;
    
    const features = {
      biometric_checkin: await churchStorage.hasFeatureAccess(churchId, 'biometric_checkin'),
      family_checkin: await churchStorage.hasFeatureAccess(churchId, 'family_checkin'),
      visitor_management: await churchStorage.hasFeatureAccess(churchId, 'visitor_management'),
      history_tracking: await churchStorage.hasFeatureAccess(churchId, 'history_tracking'),
      follow_up_queue: await churchStorage.hasFeatureAccess(churchId, 'follow_up_queue'),
      basic_reports: await churchStorage.hasFeatureAccess(churchId, 'basic_reports'),
      full_analytics: await churchStorage.hasFeatureAccess(churchId, 'full_analytics'),
      email_notifications: await churchStorage.hasFeatureAccess(churchId, 'email_notifications'),
      sms_notifications: await churchStorage.hasFeatureAccess(churchId, 'sms_notifications'),
      bulk_upload: await churchStorage.hasFeatureAccess(churchId, 'bulk_upload'),
      advanced_roles: await churchStorage.hasFeatureAccess(churchId, 'advanced_roles'),
      multi_location: await churchStorage.hasFeatureAccess(churchId, 'multi_location'),
      api_access: await churchStorage.hasFeatureAccess(churchId, 'api_access'),
      custom_branding: await churchStorage.hasFeatureAccess(churchId, 'custom_branding'),
    };

    res.json({ features });
  } catch (error) {
    console.error('Get features error:', error);
    res.status(500).json({ error: 'Failed to get feature access' });
  }
});

// GET /api/churches/usage - Get current usage statistics
router.get('/usage', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const churchId = req.churchId!;
    const church = await churchStorage.getChurchById(churchId);
    
    if (!church) {
      return res.status(404).json({ error: 'Church not found' });
    }

    const memberCount = await churchStorage.getChurchMemberCount(churchId);
    const memberLimit = church.maxMembers;
    const memberUsagePercent = Math.round((memberCount / memberLimit) * 100);

    res.json({
      usage: {
        members: {
          current: memberCount,
          limit: memberLimit,
          percentage: memberUsagePercent,
        },
        subscriptionTier: church.subscriptionTier,
        trialDaysRemaining: await churchStorage.getTrialDaysRemaining(churchId),
      },
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

// POST /api/churches/check-subdomain - Check if subdomain is available
router.post('/check-subdomain', async (req, res) => {
  try {
    const { subdomain } = z.object({
      subdomain: z.string().min(3, "Subdomain must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens"),
    }).parse(req.body);

    const isAvailable = await churchStorage.isSubdomainAvailable(subdomain);
    
    res.json({ 
      available: isAvailable,
      subdomain,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid subdomain format', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Failed to check subdomain' });
  }
});

export default router;