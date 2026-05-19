#!/usr/bin/env node
/**
 * sync-build.js
 * Wordt uitgevoerd als predev-stap via package.json "predev".
 * Leest het huidige build-nummer uit build.json en logt het —
 * zodat de dev-server altijd hetzelfde build-nummer toont als
 * de laatste productie-build (ZONDER het nummer op te hogen).
 *
 * Stroom:
 *   npm run build  →  prebuild (bump-build.js, +1)  →  vite build
 *   npm run dev    →  predev  (sync-build.js, geen +1) →  vite dev
 *
 * Resultaat: dev en dist tonen altijd hetzelfde build-nummer.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildFile = join(__dirname, '..', 'build.json');

let current = { build: 0, timestamp: new Date().toISOString() };
if (existsSync(buildFile)) {
  try {
    current = JSON.parse(readFileSync(buildFile, 'utf-8'));
  } catch {
    current = { build: 0, timestamp: new Date().toISOString() };
  }
}

console.log(`ℹ️  Dev server gestart met build #${current.build} (${current.timestamp})`);
console.log(`   Zelfde als laatste productie-build. Voer "npm run build" uit voor een nieuw build-nummer.`);
