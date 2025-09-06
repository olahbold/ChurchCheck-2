// // server/db.ts
// import 'dotenv/config';
// import pg from 'pg';                  // ⬅️ default import, not { Pool }
// import { drizzle } from 'drizzle-orm/node-postgres';

// const { Pool } = pg;                  // destructure from default
// if (!process.env.DATABASE_URL) {
//   throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
// }

// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   // ssl: { rejectUnauthorized: false }, // if needed
// });

// export const db = drizzle(pool);

// export async function assertDbConnection() {
//   await pool.query('select 1');
//   console.log('[db] connected');
// }


// server/db.ts
import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

const { Pool } = pg;

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL must be set');

const needsSsl =
  /neon\.tech|render\.com|herokuapp\.com|aws/.test(url) || /sslmode=require/.test(url);

export const pool = new Pool({
  connectionString: url,
  // For Neon & most managed Postgres, SSL is required
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export async function assertDbConnection() {
  await pool.query('select 1');
  console.log('[db] connected');
}

// graceful shutdown (prevents hung dev restarts)
process.on('SIGINT', async () => { await pool.end(); process.exit(0); });
process.on('SIGTERM', async () => { await pool.end(); process.exit(0); });
