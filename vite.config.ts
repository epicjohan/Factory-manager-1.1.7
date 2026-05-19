/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
// Fix: Import the process object to access cwd(), as named exports are not supported in all Node environments for node:process
import process from 'node:process';

// Lees het build-nummer uit build.json (wordt aangemaakt door scripts/bump-build.js)
const buildFile = path.resolve('./build.json');
const buildInfo = existsSync(buildFile)
  ? JSON.parse(readFileSync(buildFile, 'utf-8'))
  : { build: 0, timestamp: new Date().toISOString() };
const BUILD_NUMBER = buildInfo.build as number;
const BUILD_TIMESTAMP = buildInfo.timestamp as string;

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
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
          skipWaiting: true,   // Nieuwe SW neemt direct over na download
          clientsClaim: true,  // Nieuwe SW claimt alle open tabs meteen
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
    // Injecteer build-nummer als globale constanten — beschikbaar in de hele app
    define: {
      __BUILD_NUMBER__: BUILD_NUMBER,
      __BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
    },
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
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./setupTests.ts']
    }
  };
});
