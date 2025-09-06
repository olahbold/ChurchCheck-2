// vite.config.ts
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Use a fixed dev API target; proxy handles /api calls
const DEV_API_TARGET = process.env.API_TARGET || 'http://localhost:3001';

export default defineConfig(async ({ command, mode }) => {
  const isDev = command === 'serve';
  const isReplit = !!process.env.REPL_ID;

  const plugins = [react(), runtimeErrorOverlay(), splitVendorChunkPlugin()];

  // Only load the Replit cartographer plugin when actually on Replit + dev
  if (isDev && isReplit) {
    const { cartographer } = await import('@replit/vite-plugin-cartographer');
    plugins.push(cartographer());
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
      manifest: true,                       // useful if a server needs to read built asset paths
      sourcemap: mode !== 'production',     // toggle as you like
      rollupOptions: {
        output: {
          // Light manual chunking to reduce the main bundle size
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router'))
                return 'react-vendor';
              if (id.includes('@radix-ui')) return 'radix';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('date-fns') || id.includes('dayjs')) return 'dates';
              if (id.includes('recharts') || id.includes('chart.js')) return 'charts';
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1200,          // keep warnings sane after splitting
    },
    server: {
      // expose to LAN/Replit only if you need it:
      host: isReplit ? true : 'localhost',
      port: 5173,                            // keep this fixed; let your API use 3001
      strictPort: true,
      cors: false,                           // proxy makes it same-origin in dev
      proxy: {
        '/api': {
          target: DEV_API_TARGET,
          changeOrigin: true,
          secure: false,
        },
        // websocket endpoints (only if you actually use them)
        '/socket.io': {
          target: DEV_API_TARGET,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: DEV_API_TARGET,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
      fs: {
        strict: true,
        deny: ['**/.*'],
      },
      // Only set HMR overrides if you’re tunneling/https dev
      hmr: (process.env.HMR_HOST || process.env.HMR_PROTOCOL || process.env.HMR_CLIENT_PORT)
        ? {
            host: process.env.HMR_HOST,
            protocol: process.env.HMR_PROTOCOL as 'ws' | 'wss' | undefined,
            clientPort: process.env.HMR_CLIENT_PORT
              ? Number(process.env.HMR_CLIENT_PORT)
              : undefined,
          }
        : undefined,
    },
    // Optional: vite preview config (if you ever use `vite preview`)
    preview: {
      port: 5173,
      strictPort: true,
    },
  };
});
