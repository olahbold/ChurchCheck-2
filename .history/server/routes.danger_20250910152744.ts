// server/routes.danger.ts
import { Router } from 'express';
import { churchStorage } from './church-storage.js';
import { authenticateToken, requireRole, type AuthenticatedRequest } from './auth.js';

const router = Router();

/**
 * Clear tenant data (keep church + church users; NEVER touch superAdmins)
 * POST /api/admin/danger/clear-all-data
 */
router.post('/api/admin/danger/clear-all-data',
  authenticateToken,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res) => {
    const errorId = Math.random().toString(36).slice(2, 10);
    try {
      if (!req.churchId) {
        return res.status(400).json({ error: 'Missing church context', code: 'NO_CHURCH', errorId });
      }

      await churchStorage.clearTenantData(req.churchId);

      return res.json({
        ok: true,
        message: 'Tenant data cleared (admins preserved).',
      });
    } catch (err: any) {
      // Surface useful info in server logs
      console.error(`[danger][clear-all][${errorId}]`, err?.message, err?.stack, {
        churchId: req.churchId,
        user: req.user,
      });

      // Translate common DB errors
      if (err?.code === '23503') {
        return res.status(409).json({
          error: 'Foreign key constraint failed while clearing data',
          code: 'FK_CONSTRAINT',
          errorId,
        });
      }

      return res.status(500).json({ error: 'Failed to clear data', errorId });
    }
  }
);

/**
 * Factory reset tenant (delete church, church users, subscription, etc.; NEVER superAdmins)
 * POST /api/admin/danger/factory-reset
 */
router.post('/api/admin/danger/factory-reset',
  authenticateToken,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res) => {
    const errorId = Math.random().toString(36).slice(2, 10);
    try {
      if (!req.churchId) {
        return res.status(400).json({ error: 'Missing church context', code: 'NO_CHURCH', errorId });
      }

      await churchStorage.factoryResetTenant(req.churchId);

      return res.json({
        ok: true,
        message: 'Tenant factory reset completed.',
      });
    } catch (err: any) {
      console.error(`[danger][factory-reset][${errorId}]`, err?.message, err?.stack, {
        churchId: req.churchId,
        user: req.user,
      });

      return res.status(500).json({ error: 'Failed to factory reset', errorId });
    }
  }
);

export default router;
