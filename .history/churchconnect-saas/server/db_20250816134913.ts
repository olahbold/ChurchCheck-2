// import { Pool, neonConfig } from '@neondatabase/serverless';
// import { drizzle } from 'drizzle-orm/neon-serverless';
// import ws from "ws";
// import * as schema from "@shared/schema";

// neonConfig.webSocketConstructor = ws;

// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

// export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// export const db = drizzle({ client: pool, schema });

// server/db.ts
// server/db.ts
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Force load ../.env relative to /server/*
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.DATABASE_URL) {
  console.error("Loaded .env from:", path.resolve(__dirname, "../.env"));
  console.error("process.cwd():", process.cwd());
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

import { Pool } from "pg";
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// optional: log once
console.log("DB URL present ✅");
