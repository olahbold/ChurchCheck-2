// server/routes.danger.ts
import { Router } from 'express';
import { churchStorage } from './church-storage.js';
import { authenticateToken, requireRole, type AuthenticatedRequest } from './auth.js';

const danger = Router();

// Clear tenant data (keep church + churchUsers). Roles: admin/owner/super_admin
danger.post('/api/admin/danger/clear-all-data',
  authenticateToken,
  requireRole(['admin','owner','super_admin']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.churchId) return res.status(400).json({ error: 'Missing churchId' });
      await churchStorage.clearTenantData(req.churchId);
      res.json({ ok: true, message: 'Tenant data cleared (admins preserved).' });
    } catch (e) { next(e); }
  }
);

// Factory reset (delete church + churchUsers + subscription + data). Roles: owner/super_admin
danger.post('/api/admin/danger/factory-reset',
  authenticateToken,
  requireRole(['owner','super_admin']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.churchId) return res.status(400).json({ error: 'Missing churchId' });
      await churchStorage.factoryResetTenant(req.churchId);
      res.json({ ok: true, message: 'Factory reset completed.' });
    } catch (e) { next(e); }
  }
);

export default danger;
