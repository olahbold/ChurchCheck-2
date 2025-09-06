// server/db.ts (hybrid)
import 'dotenv/config';
import * as schema from '@shared/schema';

const url = process.env.DATABASE_URL!;
const isNeon = /neon\.tech|sslmode=require|pooler/.test(url);

let db: any;
let assertDbConnection: () => Promise<void>;

if (isNeon) {
  const { neon, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  neonConfig.fetchConnectionCache = true;

  const sql = neon(url);
  db = drizzle(sql, { schema });
  assertDbConnection = async () => { await sql`select 1`; };
} else {
  const pg = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const pool = new pg.Pool({ connectionString: url });
  db = drizzle(pool, { schema });
  assertDbConnection = async () => { await pool.query('select 1'); };
}

export { db, assertDbConnection };
