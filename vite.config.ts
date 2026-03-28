import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
// Fix: Import the process object to access cwd(), as named exports are not supported in all Node environments for node:process
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Use path.resolve() instead of process.cwd() to resolve the current working directory and avoid typing issues with the process object
  const env = loadEnv(mode, path.resolve(), '');
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'icon.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5 MB
        },
        manifest: {
          name: 'Factory Manager',
          short_name: 'FactoryMgr',
          description: 'Professioneel Beheersysteem voor CNC, Robots en Materieel',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    base: './', 
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      cssCodeSplit: false, // Bundel alle CSS in één bestand om path-issues te minimaliseren
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    }
  };
});
