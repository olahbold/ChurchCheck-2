import 'dotenv/config';                 
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}


if (!/sslmode=require/i.test(url) && /neon\.tech/.test(url)) {
  console.warn('[drizzle] Tip: add ?sslmode=require to your Neon DATABASE_URL');
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
