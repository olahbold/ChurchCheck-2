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
import { insertChurchSchema, insertChurchUserSchema, kioskSettingsSchema } from '../shared/schema.js';

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



// POST /api/churches/register - Register new church with admin user
router.post('/register', async (req, res) => {
  try {
    const registrationData = churchRegistrationSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await churchStorage.getChurchUserByEmail(registrationData.adminEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate subdomain if not provided
    let subdomain = registrationData.subdomain || generateSubdomain(registrationData.churchName);
    
    // Ensure subdomain is unique
    let counter = 1;
    let originalSubdomain = subdomain;
    while (!(await churchStorage.isSubdomainAvailable(subdomain))) {
      subdomain = `${originalSubdomain}-${counter}`;
      counter++;
    }

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
    const adminUser = await churchStorage.createChurchUser({
      churchId: church.id,
      email: registrationData.adminEmail,
      passwordHash,
      firstName: registrationData.adminFirstName,
      lastName: registrationData.adminLastName,
      role: 'admin',
      isActive: true,
    });

    // Generate JWT token
    const token = generateToken({
      id: adminUser.id,
      churchId: church.id,
      email: adminUser.email,
      role: adminUser.role,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
    });

    res.status(201).json({
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
  } catch (error) {
    console.error('Church registration error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Registration failed' });
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

    res.json({
      kioskModeEnabled: church.kioskModeEnabled || false,
      kioskSessionTimeout: church.kioskSessionTimeout || 60,
    });
  } catch (error) {
    console.error('Get kiosk settings error:', error);
    res.status(500).json({ error: 'Failed to get kiosk settings' });
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