#!/usr/bin/env node
// Generates public/og-default.png (1200×630) for default Open Graph image.
// Magazine-style: paper background, vermillion ink, masthead lockup.
// Run once: `node scripts/gen-og-image.mjs`

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="grain" patternUnits="userSpaceOnUse" width="4" height="4">
      <circle cx="1" cy="1" r=".55" fill="rgba(26,22,20,.18)"/>
    </pattern>
  </defs>

  <!-- Paper -->
  <rect width="1200" height="630" fill="#F2E6D0"/>

  <!-- Vermillion top strip -->
  <rect x="0" y="0" width="1200" height="56" fill="#E84F1B"/>
  <text x="40" y="38" font-family="Georgia, serif" font-size="20" fill="#F2E6D0" letter-spacing="3">
    VOL. 01 · NO. 008 · FIELD EDITION · 2026
  </text>
  <text x="1160" y="38" text-anchor="end" font-family="Georgia, serif" font-size="20" fill="#F2E6D0" letter-spacing="3">
    THE SURF STUDY
  </text>

  <!-- Hairline -->
  <line x1="40" y1="98" x2="1160" y2="98" stroke="#1A1614" stroke-width="2"/>
  <line x1="40" y1="106" x2="1160" y2="106" stroke="#1A1614" stroke-width="1"/>

  <!-- Title block -->
  <text x="600" y="270" text-anchor="middle" font-family="'Abril Fatface', Georgia, serif" font-size="148" font-weight="900" fill="#1A1614" letter-spacing="-2">
    The Surf Study
  </text>
  <text x="600" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="56" font-weight="900" fill="#1A1614" letter-spacing="18">
    衝 浪 研 究 室
  </text>

  <!-- Tagline strip -->
  <line x1="40" y1="404" x2="1160" y2="404" stroke="#1A1614" stroke-width="2"/>
  <text x="600" y="448" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#1A1614" font-style="italic">
    八份田野檔案 · 257 個浪點與板款 · 一本非旅遊指南
  </text>
  <line x1="40" y1="478" x2="1160" y2="478" stroke="#1A1614" stroke-width="1"/>

  <!-- Issue chips -->
  <g font-family="JetBrains Mono, monospace" font-size="15" fill="#1A1614" letter-spacing="2">
    <text x="600" y="530" text-anchor="middle">
      BALI · HAINAN · AUSTRALIA · TAIWAN · JAPAN · KOREA · BOARDS · BIG WAVE
    </text>
  </g>

  <!-- Footer -->
  <rect x="0" y="574" width="1200" height="56" fill="#1A1614"/>
  <text x="40" y="610" font-family="JetBrains Mono, monospace" font-size="16" fill="#F2E6D0" letter-spacing="2">
    SURF-STUDY.JKJKING987.WORKERS.DEV
  </text>
  <text x="1160" y="610" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="16" fill="#E84F1B" letter-spacing="2">
    ● FIELD JOURNAL · 2026
  </text>

  <!-- Grain overlay -->
  <rect width="1200" height="574" fill="url(#grain)" opacity=".5"/>
</svg>`;

const out = resolve(__dirname, '..', 'public', 'og-default.png');
await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log(`Wrote ${out}`);
