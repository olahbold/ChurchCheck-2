// server/db.ts
import dotenv from 'dotenv';

// Load the right env file first, then fall back to .env if needed
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });
if (!process.env.DATABASE_URL) {
  // Fallback if the targeted file is missing
  dotenv.config();
}

import * as schema from '@shared/schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL must be set');

let db: any;
let assertDbConnection: () => Promise<void>;

if (/neon\.tech|sslmode=require|pooler/.test(url)) {
  // --- Neon driver ---
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const { neon, neonConfig } = await import('@neondatabase/serverless');

  neonConfig.fetchConnectionCache = true;

  const sql = neon(url);
  db = drizzle(sql, { schema });
  assertDbConnection = async () => {
    await sql`select 1`;
    console.log('[db] connected (Neon serverless)');
  };
} else {
  // --- Local dev (pg) ---
  const pg = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');

  const pool = new pg.Pool({ connectionString: url });
  db = drizzle(pool, { schema });
  assertDbConnection = async () => {
    await pool.query('select 1');
    console.log('[db] connected (local Postgres)');
  };

  process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
  process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
}

export { db, assertDbConnection };
