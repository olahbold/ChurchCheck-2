// server/db.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Optional: caches fetch connections; good for long-lived Node processes
neonConfig.fetchConnectionCache = true;

// Required
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL must be set');

// Strongly recommended for Neon:
if (!/sslmode=require/i.test(url)) {
  // Won't throw, but add this so SSL is explicit
  console.warn('[db] Tip: append ?sslmode=require to your Neon DATABASE_URL');
}

export const sql = neon(url);                // Neon SQL client (HTTP/WebSocket under the hood)
export const db  = drizzle(sql, { schema }); // Drizzle ORM bound to Neon

export async function assertDbConnection() {
  // Works for both Neon and pg clients
  await sql`select 1`;
  console.log('[db] connected (neon-serverless)');
}

// graceful shutdown is a no-op for Neon HTTP, but keep the signals for symmetry
process.on('SIGINT',  () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
process.on('SIGQUIT', () => process.exit(0));