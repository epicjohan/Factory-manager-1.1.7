import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Fix: Import the process object to access cwd(), as named exports are not supported in all Node environments for node:process
import process from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Use path.resolve() instead of process.cwd() to resolve the current working directory and avoid typing issues with the process object
  const env = loadEnv(mode, path.resolve(), '');
  return {
    plugins: [react()],
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
