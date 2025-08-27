



// server/db.ts
import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const url = process.env.DATABASE_URL;
if (!url) {
  // helpful debug
  console.error('DATABASE_URL is missing. CWD:', process.cwd());
  throw new Error('DATABASE_URL must be set. Did you forget to create .env at project root?');
}


export const client = postgres(url, { max: 1 });
export const db = drizzle(client);

// (optional) graceful shutdown
process.on('exit', () => { try { client.end({ timeout: 5 }); } catch {} });

