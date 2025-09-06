// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: fs.existsSync(envFile) ? envFile : undefined }) || dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set for drizzle-kit");
}

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./shared/schema.ts",        // 👈 match your code import
  dbCredentials: { url: process.env.DATABASE_URL! },
});
