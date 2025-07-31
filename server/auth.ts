import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const SALT_ROUNDS = 12;

export interface ChurchUserPayload {
  id: string;
  churchId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: ChurchUserPayload;
  churchId?: string;
}

// JWT token utilities
export const generateToken = (payload: ChurchUserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): ChurchUserPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as ChurchUserPayload;
  } catch (error) {
    return null;
  }
};

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Authentication middleware
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  // Check if church is suspended
  try {
    const { churchStorage } = await import('./church-storage.js');
    const church = await churchStorage.getChurchById(user.churchId);
    
    const subscriptionTier = church?.subscriptionTier || (church as any)?.subscription_tier;
    if (church && subscriptionTier === 'suspended') {
      return res.status(403).json({ 
        error: 'Church account is suspended. Please contact support for assistance.',
        suspended: true 
      });
    }
  } catch (error) {
    console.error('Church suspension check failed:', error);
    // Continue on error to not break existing functionality
  }

  req.user = user;
  req.churchId = user.churchId;
  next();
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Church context middleware - ensures all requests are scoped to user's church
export const ensureChurchContext = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.churchId) {
    return res.status(400).json({ error: 'Church context required' });
  }
  next();
};

// Subscription tier enforcement
export const requireSubscriptionTier = (requiredTiers: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // This would check the church's subscription tier from database
    // For now, we'll implement basic logic
    // TODO: Implement actual subscription checking
    next();
  };
};

// Generate a secure subdomain from church name
export const generateSubdomain = (churchName: string): string => {
  return churchName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
};