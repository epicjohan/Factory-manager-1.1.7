#!/usr/bin/env node
/**
 * bump-build.js
 * Wordt uitgevoerd als prebuild-stap via package.json "prebuild".
 * Verhoogt het build-nummer in build.json met 1 en slaat het op.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildFile = join(__dirname, '..', 'build.json');

let current = { build: 0 };
if (existsSync(buildFile)) {
  try {
    current = JSON.parse(readFileSync(buildFile, 'utf-8'));
  } catch {
    current = { build: 0 };
  }
}

const next = {
  build: (current.build || 0) + 1,
  timestamp: new Date().toISOString(),
};

writeFileSync(buildFile, JSON.stringify(next, null, 2));
console.log(`✅ Build nummer opgehoogd: ${current.build} → ${next.build} (${next.timestamp})`);
