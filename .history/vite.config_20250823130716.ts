// // vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const DEV_API_TARGET = process.env.API_TARGET || "http://localhost:3001"; // your Express base

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,                  // allow external access (useful on Replit/LAN)
    port: Number(process.env.PORT || 5173),
    strictPort: false,
    cors: true,
    // 🔧 PROXY: all /api calls go to your Express server (avoids mixed-content & CORS)
    proxy: {
      "/api": {
        target: DEV_API_TARGET,
        changeOrigin: true,
        secure: false,
        // if your backend sets cookies, you may also want:
        // cookieDomainRewrite: { "*": "" },
      },
      // (optional) if you have websocket endpoints (e.g., /socket.io or /ws)
      "/socket.io": {
        target: DEV_API_TARGET,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: DEV_API_TARGET,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Fix HMR behind proxies/tunnels if needed
    hmr: {
      clientPort: Number(process.env.HMR_CLIENT_PORT || 443),
      protocol: process.env.HMR_PROTOCOL || undefined, // e.g. 'wss' if your page loads over https
      host: process.env.HMR_HOST || undefined,
    },
  },
});
