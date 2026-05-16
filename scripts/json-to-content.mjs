#!/usr/bin/env node

/**
 * Convert the 3 monolithic JSON files into individual .json files
 * for Astro Content Collections.
 *
 * Usage: node scripts/json-to-content.mjs
 *
 * Input:  project/data/bali.json (50 entries)
 *         project/data/hainan.json (21 entries)
 *         project/data/board.json (33 entries)
 *
 * Output: src/content/bali/{key}.json (50 files)
 *         src/content/hainan/{key}.json (21 files)
 *         src/content/boards/{key}.json (33 files)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function slugify(key) {
  return key.toLowerCase().replace(/_/g, '-');
}

function convertCollection(jsonPath, outDir) {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const [key, value] of Object.entries(raw)) {
    const slug = slugify(key);
    const outPath = join(outDir, `${slug}.json`);
    writeFileSync(outPath, JSON.stringify(value, null, 2), 'utf-8');
    count++;
  }
  return count;
}

// --- Bali ---
const baliCount = convertCollection(
  join(ROOT, 'project/data/bali.json'),
  join(ROOT, 'src/content/bali')
);
console.log(`✓ Bali: ${baliCount} entries → src/content/bali/`);

// --- Hainan ---
const hainanCount = convertCollection(
  join(ROOT, 'project/data/hainan.json'),
  join(ROOT, 'src/content/hainan')
);
console.log(`✓ Hainan: ${hainanCount} entries → src/content/hainan/`);

// --- Boards ---
const boardCount = convertCollection(
  join(ROOT, 'project/data/board.json'),
  join(ROOT, 'src/content/boards')
);
console.log(`✓ Boards: ${boardCount} entries → src/content/boards/`);

console.log(`\nTotal: ${baliCount + hainanCount + boardCount} content files generated.`);
