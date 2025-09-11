// server/index.ts
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";

import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, assertDbConnection } from "./db";
import { churchStorage } from "./storage"; // ⬅️ adjust path if yours differs

// ---- Auth config (shared) ----
export const JWT_SECRET = process.env.JWT_SECRET || "fallback-super-secret-key";
if (!process.env.JWT_SECRET) {
  console.warn("[auth] JWT_SECRET not set; using fallback key for dev ONLY");
}

const app = express();

// CORS: add localhost in dev
const corsOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://your-project.vercel.app", "https://churchconnect.netlify.app/"]
    : ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    exposedHeaders: ["X-Extended-Token"],
  })
);

// Parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// API request logger
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json.bind(res);
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson, ...args);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {
          // ignore stringify issues
        }
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

// health probe (useful during setup)
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development" });
});

// seed a default super admin IF none exists
async function seedDefaultSuperAdminIfMissing() {
  const exists = await churchStorage.anySuperAdminExists();
  if (exists) return;

  const email = (process.env.DEFAULT_SUPER_ADMIN_EMAIL || "admin@churchconnect.com").toLowerCase();
  const firstName = process.env.DEFAULT_SUPER_ADMIN_FIRST || "Super";
  const lastName = process.env.DEFAULT_SUPER_ADMIN_LAST || "Admin";
  const password = process.env.DEFAULT_SUPER_ADMIN_PASSWORD || "ChangeMe123!";

  // Your createSuperAdmin() hashes passwordHash if it's not a bcrypt hash.
  await churchStorage.createSuperAdmin({
    email,
    firstName,
    lastName,
    role: "super_admin",
    isActive: true,
    passwordHash: password,
  });

  console.log(`[seed] Created default super admin: ${email}`);
}

(async () => {
  // 1) Make sure DB is reachable
  await assertDbConnection();

  // 2) Ensure a default super admin exists
  try {
    await seedDefaultSuperAdminIfMissing();
  } catch (e) {
    console.error("[seed] Failed to seed default super admin:", e);
  }

  // 3) Register all routes (they can import JWT_SECRET from here if needed)
  const server = await registerRoutes(app);

  // 4) Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("[express error]", status, message, err?.stack ?? "");
    if (!res.headersSent) res.status(status).json({ message });
  });

  // 5) Vite dev vs. static prod
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 6) Start server
  const port = parseInt(process.env.PORT || "3001", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
