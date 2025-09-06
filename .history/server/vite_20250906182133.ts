// server/vite.ts
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// ⬅️ do NOT import 'vite' or 'vite.config' at top-level in prod

export function log(message: string, source = "express") {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [${source}] ${message}`);
}

// DEV-ONLY: dynamically import vite + config so prod bundles don't include them
export async function setupVite(app: Express, server: import("http").Server) {
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteLogger = createLogger();
  const viteConfigMod = await import("../vite.config");
  const viteConfig = (viteConfigMod as any).default ?? viteConfigMod;

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // don't kill dev server on overlay errors
        viteLogger.error(msg, options);
      },
    },
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    try {
      const __dirname = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      // optional cache-bust
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${Date.now()}"`);
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// PROD: serve dist/public reliably (dist/index.js sits next to dist/public)
export function serveStatic(app: Express) {
  const __dirname = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
  const distPath = path.resolve(__dirname, "public");
  const indexPath = path.join(distPath, "index.html");

  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing build at ${indexPath}. Run "npm run build" first.`);
  }

  app.use(
    express.static(distPath, {
      setHeaders(res, file) {
        if (file.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  // SPA fallback
  app.get("*", (_req, res) => res.sendFile(indexPath));
}
