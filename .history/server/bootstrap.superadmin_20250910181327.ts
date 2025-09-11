// server/bootstrap.superadmin.ts
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { churchStorage } from './church-storage';

export async function ensureDefaultSuperAdmin() {
  try {
    const email = process.env.SUPERADMIN_EMAIL?.trim();
    const password = process.env.SUPERADMIN_PASSWORD;
    const firstName = process.env.SUPERADMIN_FIRST?.trim() || 'System';
    const lastName = process.env.SUPERADMIN_LAST?.trim() || 'Admin';

    if (!email || !password) {
      console.log('[bootstrap] SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD missing; not seeding.');
      return;
    }

    // If any super admin exists, skip
    if (await churchStorage.anySuperAdminExists()) {
      console.log('[bootstrap] super admin exists; skipping seed.');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await churchStorage.createSuperAdmin({
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'super_admin',
      isActive: true,
    });

    console.log(`[bootstrap] created default super admin: ${email}`);
  } catch (err) {
    console.error('[bootstrap] failed to ensure default super admin:', err);
  }
}
