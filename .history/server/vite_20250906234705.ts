// server/vite.ts (replace your setupVite + serveStatic with this)
import type { Express } from "express";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(app: Express, server: Server) {
  const configFile = path.join(process.cwd(), "vite.config.ts");

  const vite = await createViteServer({
    // Use the root config you posted
    configFile,
    appType: "custom",
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    customLogger: {
      ...viteLogger,
      // don't exit the process on dev errors
      error: (msg, options) => viteLogger.error(msg, options),
    },
  });

  app.use(vite.middlewares);

  // Serve index.html only for HTML navigations (not assets/HMR/API)
  app.get("*", async (req, res, next) => {
    try {
      if (req.originalUrl.startsWith("/api")) return next();
      const accept = req.headers.accept || "";
      if (!accept.includes("text/html")) return next();

      // Your root config sets root: client/, so index.html is under client/
      const clientIndex = path.join(process.cwd(), "client", "index.html");
      let template = await fs.promises.readFile(clientIndex, "utf-8");

      // Optional cache-bust
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      template = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace?.(e as Error);
      next(e);
    }
  });

  console.log("[vite] middleware mounted");
  console.log("  configFile:", configFile);
}

export function serveStatic(app: Express) {
  // Match your Vite build outDir from the root config:
  // build.outDir = path.resolve(__dirname, 'dist/public')
  // When running from project root, that resolves to "<root>/dist/public"
  const clientDist = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(clientDist)) {
    throw new Error(
      `Could not find client build at: ${clientDist}. Run the build first.`
    );
  }

  app.use(express.static(clientDist, { index: false }));

  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });

  console.log("[static] serving client from:", clientDist);
}
