// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import fs from "node:fs";

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";

// Load chosen env first, then fall back to .env if missing
if (fs.existsSync(envFile)) dotenv.config({ path: envFile });
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for drizzle-kit");
}

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./shared/schema.ts", // make sure this path is correct from repo root
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,     // fail on dangerous operations
  verbose: true,    // more CLI logs
});
