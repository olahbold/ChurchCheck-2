// server/vite.ts
import type { Express } from "express";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // 🔒 Pin Vite to the client folder and its config
  const clientRoot = path.resolve(process.cwd(), "client");
  const configFile = path.join(clientRoot, "vite.config.ts");

  const vite = await createViteServer({
    root: clientRoot,
    configFile,                // ensure we use client's config
    appType: "custom",
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    // never kill the process on Vite errors during dev
    customLogger: {
      ...viteLogger,
      error: (msg, options) => viteLogger.error(msg, options),
    },
  });

  // Mount Vite middleware first
  app.use(vite.middlewares);

  // Serve index.html ONLY for HTML navigations (not assets/HMR)
  app.get("*", async (req, res, next) => {
    try {
      if (req.originalUrl.startsWith("/api")) return next();
      const accept = req.headers.accept || "";
      if (!accept.includes("text/html")) return next();

      const url = req.originalUrl;
      const indexHtmlPath = path.join(clientRoot, "index.html");
      let template = await fs.promises.readFile(indexHtmlPath, "utf-8");

      // cache-bust main entry if you like
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace?.(e as Error);
      next(e);
    }
  });

  log("[vite] middleware mounted", "vite");
  log(`root: ${clientRoot}`, "vite");
  log(`configFile: ${configFile}`, "vite");
}

export function serveStatic(app: Express) {
  // In prod we expect client build at dist/client
  const clientDist = path.resolve(process.cwd(), "dist", "client");

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

  log(`[static] serving client from: ${clientDist}`, "vite");
}
