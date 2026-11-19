import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // relative base so the build works from any sub-path (Cloudflare Pages, previews)
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // registered from main.tsx so it can fail quietly
      manifest: false, // public/manifest.webmanifest is the source of truth
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  worker: { format: 'es' },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1800,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
});
