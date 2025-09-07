// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DEV_API_TARGET = process.env.API_TARGET || 'http://localhost:3001';

export default defineConfig(async ({ command, mode }) => {
  const isDev = command === 'serve';
  const isReplit = !!process.env.REPL_ID;

  const plugins = [react()];

  // ✅ dev-only overlays (don’t include in production bundle)
  if (isDev) {
    plugins.push(runtimeErrorOverlay());
    if (isReplit) {
      const { cartographer } = await import('@replit/vite-plugin-cartographer');
      plugins.push(cartographer());
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client', 'src'),
        '@shared': path.resolve(__dirname, 'shared'),
        '@assets': path.resolve(__dirname, 'attached_assets'),
      },
    },
    root: path.resolve(__dirname, 'client'),
    build: {
      outDir: path.resolve(__dirname, 'dist/public'),
      emptyOutDir: true,
      manifest: true,
      sourcemap: true,             // 👈 keep on temporarily for easier debugging
      // ❌ disable custom manualChunks for now; let Vite decide safe splits
      // rollupOptions: { output: { manualChunks() { /* disabled */ } } },
      chunkSizeWarningLimit: 1200,
    },
    server: {
      host: isReplit ? true : 'localhost',
      port: 5173,
      strictPort: true,
      cors: false,
      proxy: {
        '/api': { target: DEV_API_TARGET, changeOrigin: true, secure: false },
        '/socket.io': { target: DEV_API_TARGET, ws: true, changeOrigin: true, secure: false },
        '/ws': { target: DEV_API_TARGET, ws: true, changeOrigin: true, secure: false },
      },
      fs: { strict: true, deny: ['**/.*'] },
      hmr:
        process.env.HMR_HOST || process.env.HMR_PROTOCOL || process.env.HMR_CLIENT_PORT
          ? {
              host: process.env.HMR_HOST,
              protocol: process.env.HMR_PROTOCOL as 'ws' | 'wss' | undefined,
              clientPort: process.env.HMR_CLIENT_PORT
                ? Number(process.env.HMR_CLIENT_PORT)
                : undefined,
            }
          : undefined,
    },
    preview: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': 'http://localhost:3001' },
    },
  };
});
