#!/usr/bin/env node
/**
 * replace-icons.mjs
 * Replaces all "from 'lucide-react'" with "from '<relative-path-to-icons.ts>'"
 * across all .tsx and .ts files in the project.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';

const ROOT = process.cwd();
const SHIM = join(ROOT, 'icons.ts');

// Recursively collect all .tsx and .ts files (excluding node_modules, dist, public)
function collectFiles(dir, results = []) {
    const skip = ['node_modules', 'dist', 'public', '.git'];
    for (const entry of readdirSync(dir)) {
        if (skip.includes(entry)) continue;
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
            collectFiles(full, results);
        } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
            // Skip the shim itself
            if (full === SHIM) continue;
            results.push(full);
        }
    }
    return results;
}

const files = collectFiles(ROOT);
let changed = 0;

for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (!content.includes("from 'lucide-react'")) continue;

    // Calculate relative path from this file to icons.ts
    const rel = relative(dirname(file), ROOT);
    // rel is like '../..' or '..' etc — join with 'icons'
    let shimPath = (rel ? rel + '/icons' : './icons').replace(/\\/g, '/');
    if (!shimPath.startsWith('.')) shimPath = './' + shimPath;

    const updated = content.replaceAll("from 'lucide-react'", `from '${shimPath}'`);
    writeFileSync(file, updated, 'utf8');
    console.log(`✓ ${file.replace(ROOT + '/', '')}`);
    changed++;
}

console.log(`\nDone — updated ${changed} files.`);
