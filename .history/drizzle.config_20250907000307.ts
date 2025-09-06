// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

const root = process.cwd();
const candidate =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
const envPath = path.join(root, candidate);

// load the targeted env, fall back to plain .env if missing
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
else dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    `DATABASE_URL not set. Tried ${envPath} and .env. ` +
    `Set it or run with dotenv: "dotenv -e .env.production -- drizzle-kit push".`
  );
}

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",                 // adjust if you prefer a different folder
  schema: "./server/schema.ts",     // <-- set to your actual schema file(s)
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
