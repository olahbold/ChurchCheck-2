// server/db.ts
import 'dotenv/config';
import * as schema from '@shared/schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL must be set');

let db: any;
let assertDbConnection: () => Promise<void>;

(async () => {
  if (/neon\.tech|sslmode=require|pooler/.test(url)) {
    // --- Neon driver ---
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const { neon, neonConfig } = await import('@neondatabase/serverless');

    neonConfig.fetchConnectionCache = true;

    const client = neon(url);
    db = drizzle(client, { schema });
    assertDbConnection = async () => {
      await client.query('select 1');
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
})();

export { db, assertDbConnection };
