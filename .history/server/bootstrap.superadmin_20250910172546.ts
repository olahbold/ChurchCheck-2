// server/bootstrap.superadmin.ts
import { churchStorage } from "./church-storage";

export async function ensureDefaultSuperAdmin() {
  // Only seed in production; remove this check if you also want it in dev.
  if (process.env.NODE_ENV !== "production") {
    console.log("[bootstrap] Skip super admin seed (NODE_ENV != production)");
    return;
  }

  const email = process.env.SUPERADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD;
  const firstName = process.env.SUPERADMIN_FIRST || "System";
  const lastName  = process.env.SUPERADMIN_LAST  || "Admin";

  if (!email || !password) {
    console.warn("[bootstrap] SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD missing; not seeding.");
    return;
  }

  const existing = await churchStorage.getSuperAdminByEmail(email);
  if (existing) {
    console.log(`[bootstrap] Super admin already exists: ${email}`);
    return;
  }

  // Your createSuperAdmin hashes if not already hashed ($2b$…)
  await churchStorage.createSuperAdmin({
    email,
    passwordHash: password,
    firstName,
    lastName,
    role: "super",     // use your role string as needed
    isActive: true,
  } as any);

  console.log(`[bootstrap] Super admin created: ${email}`);
}
