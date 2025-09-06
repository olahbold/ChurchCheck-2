// vite.config.ts (at repo root)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(new URL('.', import.meta.url)))

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'client'),         // <-- your app lives here
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),// <-- emit here
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
})
