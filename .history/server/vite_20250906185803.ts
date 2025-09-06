// server/vite.ts
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function log(message: string, source = "express") {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [${source}] ${message}`);
}

// DEV ONLY
export async function setupVite(app: Express, server: import("http").Server) {
  // ⬇️ move vite imports here
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteLogger = createLogger();
  const viteConfigMod = await import("../vite.config");
  const viteConfig = viteConfigMod.default ?? viteConfigMod;

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
    customLogger: viteLogger,
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    try {
      const __dirname = path.dirname(fileURLToPath(new URL(".", import.meta.url)));
      const clientTemplate = path.resolve(__dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

// PROD ONLY
export function serveStatic(app: Express) {
  const bundleDir = path.dirname(process.argv[1]!);            // -> .../dist
  const distPath  = path.resolve(bundleDir, "public");          // -> .../dist/public
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

