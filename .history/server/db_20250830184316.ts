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


