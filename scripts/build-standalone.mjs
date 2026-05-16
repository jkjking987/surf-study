#!/usr/bin/env node

/**
 * Standalone static site builder — generates the full site as plain HTML
 * that works WITHOUT Astro (for when npm install is unavailable).
 *
 * Generates:
 *   dist/index.html           — Landing page
 *   dist/bali/index.html      — Bali issue
 *   dist/hainan/index.html    — Hainan issue
 *   dist/boards/index.html    — Board Lab issue
 *   dist/bali/{slug}.html     — 50 Bali entry pages
 *   dist/hainan/{slug}.html   — 21 Hainan entry pages
 *   dist/boards/{slug}.html   — 33 Board entry pages
 *   dist/styles/              — CSS
 *   dist/scripts/             — JS
 *   dist/data/                — JSON
 *
 * Usage: node scripts/build-standalone.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');
const PROJECT = join(ROOT, 'project');

// ===== Helpers =====

function ensureDir(d) { mkdirSync(d, { recursive: true }); }

function copyDir(src, dest) {
  ensureDir(dest);
  for (const f of readdirSync(src)) {
    copyFileSync(join(src, f), join(dest, f));
  }
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(key) {
  return key.toLowerCase().replace(/_/g, '-');
}

// ===== HTML Template =====

function baseHTML(title, description, cssFiles, bodyContent, jsFiles = []) {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:type" content="website"/>
${cssFiles.map(f => `<link rel="stylesheet" href="${f}"/>`).join('\n')}
</head>
<body>
${bodyContent}
${jsFiles.map(f => `<script src="${f}"></script>`).join('\n')}
</body>
</html>`;
}

// ===== Issue page shell =====

function issueShell(title, desc, heading, headingCh, issueNo, issueStats, issueEdition, current, innerContent, jsPath) {
  const issues = [
    { id: 'bali', href: '/bali/', label: 'No. 001 · BALI' },
    { id: 'hainan', href: '/hainan/', label: 'No. 002 · 海南' },
    { id: 'board', href: '/boards/', label: 'No. 003 · BOARD LAB' },
  ];
  const navHTML = issues.map(i =>
    `<a href="${i.href}" class="${i.id === current ? 'current' : ''}">${i.label}</a>`
  ).join('\n');

  const body = `
<div class="issue-page">
  <div class="crumb-bar">
    <a class="home" href="/">回到主期刊 / SURF STUDY HOME</a>
    <div class="nav-issues">${navHTML}</div>
    <div>2026.05.15</div>
  </div>
  <header class="issue-mast">
    <h1><span class="ch">${headingCh}</span>${heading}</h1>
    <div class="right">ISSUE<br/><span class="big">No. ${issueNo}</span><br/>${issueStats}<br/>${issueEdition}</div>
  </header>
  ${innerContent}
</div>
<button id="search-fab" onclick="openGlobalSearch()">⌕ SEARCH ALL <small>/</small></button>
`;
  return baseHTML(
    title, desc,
    ['/styles/tokens.css', '/styles/common.css', '/styles/issue.css'],
    body,
    ['/scripts/common.js', jsPath]
  );
}

// ===== Entry page template =====

function entryPageHTML({ title, desc, crumbLabel, crumbHref, name, tags, sections, backLabel, backHref }) {
  const tagsHTML = tags.map(t => `<span class="tag ${t.cls || ''}">${esc(t.label)}</span>`).join('');

  const sectionsHTML = sections.map(s => {
    const kvHTML = s.entries.map(([k, v]) =>
      `<div class="k">${esc(k)}</div><div class="v">${esc(v)}</div>`
    ).join('');
    return `<section class="entry-section"><h3>${esc(s.title)}</h3><div class="entry-kv">${kvHTML}</div></section>`;
  }).join('');

  const body = `
<style>
.entry-page{max-width:840px;margin:0 auto;padding:28px}
.entry-crumb{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;display:flex;gap:8px;align-items:center;padding-bottom:16px;border-bottom:1.5px solid var(--ink);flex-wrap:wrap}
.entry-crumb a{color:var(--ink-soft);text-decoration:none}.entry-crumb a:hover{color:var(--vermillion)}
.entry-crumb .sep{opacity:.4}
.entry-head{padding:28px 0 20px;border-bottom:3px double var(--ink)}
.entry-head h1{font-family:var(--display);font-size:clamp(32px,6vw,52px);line-height:.92;margin:0 0 12px}
.entry-head .entry-id{font-family:var(--mono);font-size:13px;letter-spacing:.08em;color:var(--vermillion-d);margin-bottom:6px}
.entry-head .positioning{font-family:var(--serif);font-size:15px;font-style:italic;color:var(--ink-soft);line-height:1.55;margin-top:8px}
.entry-head .tagrow{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.entry-section{border-bottom:1px solid var(--ink);padding:20px 0}
.entry-section h3{font-family:var(--display-3);font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 14px;color:var(--vermillion-d)}
.entry-kv{display:grid;grid-template-columns:200px 1fr;gap:2px 18px}
.entry-kv .k{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;padding:8px 0;color:var(--ink-soft);border-bottom:1px dashed var(--ink)}
.entry-kv .v{font-family:var(--serif);font-size:14px;line-height:1.55;padding:8px 0;border-bottom:1px dashed var(--ink);word-break:break-word}
.entry-kv .v:last-child,.entry-kv .k:nth-last-child(2){border-bottom:0}
.entry-back{padding:24px 0;display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
.entry-back a{color:var(--ink);text-decoration:none;padding:6px 12px;border:1.5px solid var(--ink);transition:all .15s}
.entry-back a:hover{background:var(--ink);color:var(--paper)}
@media(max-width:600px){.entry-page{padding:16px}.entry-kv{grid-template-columns:1fr}.entry-kv .k{padding:6px 0 2px;border-bottom:0}.entry-kv .v{padding:0 0 8px}.entry-head h1{font-size:28px}}
</style>
<div class="entry-page">
  <nav class="entry-crumb">
    <a href="${crumbHref.includes('..') ? '../index.html' : 'index.html'}">衝浪研究室</a><span class="sep">/</span>
    <a href="${crumbHref}">${crumbLabel}</a><span class="sep">/</span>
    <span>${esc(name)}</span>
  </nav>
  <header class="entry-head">
    <h1>${esc(name)}</h1>
    <div class="tagrow">${tagsHTML}</div>
  </header>
  ${sectionsHTML}
  <div class="entry-back">
    <a href="${backHref}">← ${backLabel}</a>
    <a href="${backHref.includes('..') ? '../index.html' : 'index.html'}">回到主期刊</a>
  </div>
</div>`;

  return baseHTML(title, desc, ['../styles/tokens.css', '../styles/common.css'], body, ['../scripts/common.js']);
}

// ===== Build Bali entries =====
function buildBaliEntries() {
  const raw = JSON.parse(readFileSync(join(PROJECT, 'data/bali.json'), 'utf-8'));
  const outDir = join(DIST, 'bali');
  ensureDir(outDir);
  let count = 0;

  const catClasses = {
    surf_spot: 'tag-verm', surf_spot_hidden: 'tag-blood',
    extension_destination: 'tag-ocean', surf_business: 'tag-teal',
    surf_resource: 'tag-ink', event_culture: 'tag-must', practical: 'tag-ink',
  };

  // Bali section label mapping for nested format
  const baliSectionLabels = {
    basic_info: 'Basic / 基本',
    surf_conditions: 'Surf Conditions / 浪況',
    practical_info: 'Practical / 實用',
    safety_culture: 'Safety & Culture / 安全 & 文化',
    services: 'Services / 服務',
    pricing: 'Pricing / 費用',
    sustainability: 'Sustainability / 永續',
    events_community: 'Events / 活動',
  };

  // Human-readable field labels
  const fieldLabels = {
    name: '名稱', category: '類別', region: '區域',
    gps_location: 'GPS', distance_from_dps_airport_km: '距機場',
    distance_from_canggu_uluwatu_min: '距 Canggu/Uluwatu',
    wave_type: '浪型', skill_level: '技術等級',
    wave_height_range: '浪高', bottom_type: '底質',
    best_season: '最佳季節', best_tide: '最佳潮汐',
    best_wind: '最佳風向', best_swell_direction: '最佳浪向',
    swell_consistency_rating: '穩定度', wave_length_meters: '浪長',
    wave_speed_rating: '浪速', takeoff_zone_difficulty: '起乘難度',
    secondary_peaks: '副浪峰', peak_crowd_level: '擁擠度',
    access: '到達方式', paddle_out_method: '划出方式',
    entry_fee: '入場費', recommended_session_time: '建議時段',
    best_time_of_day: '最佳時段', nearby_warung: '附近美食',
    alternative_spot_within_10min: '10 分鐘內替代浪點',
    boat_charter_required: '需包船', combo_trip_potential: '組合行程',
    hazards: '危險', marine_hazards: '海洋危險',
  };

  for (const [key, data] of Object.entries(raw)) {
    const slug = slugify(key);
    const isNested = 'basic_info' in data;

    let name, cat, region;
    const sections = [];

    if (isNested) {
      // Nested format: Uluwatu, Bingin, etc. (32 entries)
      const bi = data.basic_info || {};
      name = bi.name || key.replace(/_/g, ' ');
      cat = bi.category || '';
      region = bi.region || '';

      for (const [sKey, sLabel] of Object.entries(baliSectionLabels)) {
        const source = data[sKey];
        if (!source || typeof source !== 'object') continue;
        const entries = [];
        for (const [fk, fv] of Object.entries(source)) {
          if (fv == null || fv === '') continue;
          if (typeof fv === 'object') continue;
          const label = fieldLabels[fk] || fk.replace(/_/g, ' ');
          entries.push([label, String(fv).slice(0, 800)]);
        }
        if (entries.length) sections.push({ title: sLabel, entries });
      }
    } else {
      // Flat format: Balangan, etc. (18 entries)
      name = data.name || key.replace(/_/g, ' ');
      cat = data.category || '';
      region = data.region || '';

      const skipKeys = new Set(['name', 'category', 'region', 'uncertain']);
      const flatEntries = [];
      for (const [k, v] of Object.entries(data)) {
        if (skipKeys.has(k)) continue;
        if (typeof v === 'object' && v !== null) continue;
        if (v == null || v === '') continue;
        const label = fieldLabels[k] || k.replace(/_/g, ' ');
        flatEntries.push([label, String(v).slice(0, 800)]);
      }
      if (flatEntries.length > 0) {
        sections.push({ title: 'Details', entries: flatEntries });
      }
    }

    // Short name: take before first " ("
    const iP = name.indexOf(' (');
    const shortName = iP > 0 ? name.slice(0, iP).trim() : name.trim();

    const tags = [
      cat ? { label: cat.replace(/_/g, ' '), cls: catClasses[cat] || 'tag-ink' } : null,
      region ? { label: region, cls: '' } : null,
    ].filter(Boolean);

    const html = entryPageHTML({
      title: `${shortName} — Bali · 衝浪研究室`,
      desc: `${shortName} — ${region || 'Bali'}. 衝浪研究室 Bali Issue 001.`,
      crumbLabel: 'No. 001 · BALI',
      crumbHref: '../bali/index.html',
      name: shortName,
      tags,
      sections,
      backLabel: '回到 BALI INDEX',
      backHref: '../bali/index.html',
    });
    writeFileSync(join(outDir, `${slug}.html`), html, 'utf-8');
    count++;
  }
  return count;
}

// ===== Build Hainan entries =====
function buildHainanEntries() {
  const raw = JSON.parse(readFileSync(join(PROJECT, 'data/hainan.json'), 'utf-8'));
  const outDir = join(DIST, 'hainan');
  ensureDir(outDir);
  let count = 0;

  const catLabels = { artificial_wave_pool: '人工浪池', natural_surf_spot: '自然浪點', surf_school: '衝浪學校', surf_club: '衝浪俱樂部', water_resort_family: '水樂園/度假', event_festival: '賽事/節日' };
  const catClasses = { artificial_wave_pool: 'tag-ocean', natural_surf_spot: 'tag-verm', surf_school: 'tag-teal', surf_club: 'tag-teal', water_resort_family: 'tag-must', event_festival: 'tag-blood' };
  const statusLabels = { operating: '營運中', annual: '年度賽事', unverified: '未驗證', planning_unverified: '規劃中/未驗', not_found: '查無證據' };
  const statusClasses = { operating: 'tag-teal', annual: 'tag-must', unverified: 'tag-ink', planning_unverified: 'tag-ink', not_found: 'tag-blood' };

  const sectionLabels = {
    basic_info: 'Basic / 基本',
    technical_specs: 'Technical / 技術規格',
    pricing_sessions: 'Pricing / 價格',
    experience_guide: 'Experience / 體驗',
    surroundings: 'Surroundings / 周邊',
    reviews_reputation: 'Reviews / 評價',
    verification: 'Verification / 驗證',
  };

  for (const [key, data] of Object.entries(raw)) {
    const slug = slugify(key);
    const bi = data.basic_info || {};
    const name = bi.name || key;
    const cat = bi.category || '';
    const status = bi.status || '';

    const sections = [];
    for (const [sKey, sTitle] of Object.entries(sectionLabels)) {
      const source = data[sKey];
      if (!source || typeof source !== 'object') continue;
      const entries = [];
      for (const [fk, fv] of Object.entries(source)) {
        if (fv == null || fv === '') continue;
        if (typeof fv === 'object') continue;
        entries.push([fk.replace(/_/g, ' '), String(fv).slice(0, 800)]);
      }
      if (entries.length) sections.push({ title: sTitle, entries });
    }

    const tags = [
      cat ? { label: catLabels[cat] || cat, cls: catClasses[cat] || 'tag-ink' } : null,
      status ? { label: statusLabels[status] || status, cls: statusClasses[status] || 'tag-ink' } : null,
    ].filter(Boolean);

    const html = entryPageHTML({
      title: `${name} — 海南 · 衝浪研究室`,
      desc: `${name}. 衝浪研究室 Hainan Issue 002.`,
      crumbLabel: 'No. 002 · 海南',
      crumbHref: '../hainan/index.html',
      name,
      tags,
      sections,
      backLabel: '回到 HAINAN INDEX',
      backHref: '../hainan/index.html',
    });
    writeFileSync(join(outDir, `${slug}.html`), html, 'utf-8');
    count++;
  }
  return count;
}

// ===== Build Board entries =====
function buildBoardEntries() {
  const raw = JSON.parse(readFileSync(join(PROJECT, 'data/board.json'), 'utf-8'));
  const outDir = join(DIST, 'boards');
  ensureDir(outDir);
  let count = 0;

  const groupLabels = { A: '浪況情境', B: '騎手程度', C: '板型分類', D: '品牌板款', E: '特殊情境' };
  const groupClasses = { A: 'tag-ocean', B: 'tag-teal', C: 'tag-verm', D: 'tag-must', E: 'tag-blood' };

  const sectionKeys = ['buoyancy_strategy','shape_details','fin_setup','construction','conditions_fit','performance','practical_selection','pro_reference','local_taiwan_context'];
  const sectionTitles = {
    buoyancy_strategy: '浮力策略', shape_details: '版型細節', fin_setup: '鰭片配置',
    construction: '構造', conditions_fit: '適合條件', performance: '性能',
    practical_selection: '實用選擇', pro_reference: '職業參考', local_taiwan_context: '台灣浪點',
  };

  for (const [key, data] of Object.entries(raw)) {
    const slug = slugify(key);
    const bi = data.basic_info || {};
    const nameRaw = bi['名稱'] || key;
    const sub = bi['分類'] || '';
    const fit = bi['適用程度'] || '';
    const positioning = bi['一句話定位'] || '';
    const gl = key[0];

    // Short name
    const iP = nameRaw.indexOf(' (');
    const displayName = iP > 0 ? nameRaw.slice(0, iP).trim() : nameRaw.trim();

    const sections = [];
    for (const sk of sectionKeys) {
      const source = data[sk];
      if (!source || typeof source !== 'object') continue;
      const entries = [];
      for (const [fk, fv] of Object.entries(source)) {
        if (fv == null || fv === '' || typeof fv === 'object') continue;
        entries.push([fk.replace(/_/g, ' '), String(fv).slice(0, 800)]);
      }
      if (entries.length) sections.push({ title: sectionTitles[sk] || sk, entries });
    }

    const tags = [
      { label: `${gl} · ${groupLabels[gl] || ''}`, cls: groupClasses[gl] || 'tag-ink' },
      fit ? { label: fit, cls: 'tag-ink' } : null,
    ].filter(Boolean);

    const html = entryPageHTML({
      title: `${key} · ${displayName} — Board Lab · 衝浪研究室`,
      desc: `${displayName} — ${positioning.slice(0, 120)}. 衝浪研究室 Board Lab Issue 003.`,
      crumbLabel: 'No. 003 · BOARD LAB',
      crumbHref: '../boards/index.html',
      name: `${key} · ${displayName}`,
      tags,
      sections,
      backLabel: '回到 BOARD LAB',
      backHref: '../boards/index.html',
    });
    writeFileSync(join(outDir, `${slug}.html`), html, 'utf-8');
    count++;
  }
  return count;
}

// ===== Copy issue index pages from project/ =====
function copyIssueIndexes() {
  // Fix paths for root-level files (index.html)
  function fixPathsRoot(html) {
    return html
      .replace(/href="index\.html"/g, 'href="index.html"')
      .replace(/href="bali\.html"/g, 'href="bali/index.html"')
      .replace(/href="hainan\.html"/g, 'href="hainan/index.html"')
      .replace(/href="board\.html"/g, 'href="boards/index.html"')
      .replace(/src="common\.js"/g, 'src="scripts/common.js"')
      .replace(/src="bali\.js"/g, 'src="scripts/bali.js"')
      .replace(/src="hainan\.js"/g, 'src="scripts/hainan.js"')
      .replace(/src="board\.js"/g, 'src="scripts/board.js"')
      .replace(/href="style\.css"/g, 'href="styles/tokens.css"')
      .replace(/href="common\.css"/g, 'href="styles/common.css"')
      .replace(/href="issue\.css"/g, 'href="styles/issue.css"');
  }

  // Fix paths for subdirectory files (bali/, hainan/, boards/)
  function fixPathsSub(html) {
    return html
      .replace(/href="index\.html"/g, 'href="../index.html"')
      .replace(/href="bali\.html"/g, 'href="../bali/index.html"')
      .replace(/href="hainan\.html"/g, 'href="../hainan/index.html"')
      .replace(/href="board\.html"/g, 'href="../boards/index.html"')
      .replace(/src="common\.js"/g, 'src="../scripts/common.js"')
      .replace(/src="bali\.js"/g, 'src="../scripts/bali.js"')
      .replace(/src="hainan\.js"/g, 'src="../scripts/hainan.js"')
      .replace(/src="board\.js"/g, 'src="../scripts/board.js"')
      .replace(/href="style\.css"/g, 'href="../styles/tokens.css"')
      .replace(/href="common\.css"/g, 'href="../styles/common.css"')
      .replace(/href="issue\.css"/g, 'href="../styles/issue.css"');
  }

  ensureDir(join(DIST, 'bali'));
  ensureDir(join(DIST, 'hainan'));
  ensureDir(join(DIST, 'boards'));

  // Landing page (root level)
  writeFileSync(
    join(DIST, 'index.html'),
    fixPathsRoot(readFileSync(join(PROJECT, 'index.html'), 'utf-8')),
    'utf-8'
  );

  // Issue indexes (subdirectory level)
  writeFileSync(
    join(DIST, 'bali', 'index.html'),
    fixPathsSub(readFileSync(join(PROJECT, 'bali.html'), 'utf-8')),
    'utf-8'
  );
  writeFileSync(
    join(DIST, 'hainan', 'index.html'),
    fixPathsSub(readFileSync(join(PROJECT, 'hainan.html'), 'utf-8')),
    'utf-8'
  );
  writeFileSync(
    join(DIST, 'boards', 'index.html'),
    fixPathsSub(readFileSync(join(PROJECT, 'board.html'), 'utf-8')),
    'utf-8'
  );
}

// ===== Main =====
console.log('Building standalone static site...\n');

// 1. Clean + setup dist
ensureDir(DIST);

// 2. Copy static assets
copyDir(join(PUBLIC, 'styles'), join(DIST, 'styles'));
copyDir(join(PUBLIC, 'scripts'), join(DIST, 'scripts'));
copyDir(join(PUBLIC, 'data'), join(DIST, 'data'));
copyFileSync(join(PUBLIC, 'robots.txt'), join(DIST, 'robots.txt'));
console.log('✓ Static assets copied');

// 3. Copy issue index pages (from original prototype, with fixed paths)
copyIssueIndexes();
console.log('✓ Index pages generated (from prototype, paths fixed)');

// 4. Generate per-entry detail pages
const baliCount = buildBaliEntries();
console.log(`✓ Bali: ${baliCount} entry pages`);

const hainanCount = buildHainanEntries();
console.log(`✓ Hainan: ${hainanCount} entry pages`);

const boardCount = buildBoardEntries();
console.log(`✓ Boards: ${boardCount} entry pages`);

const total = 4 + baliCount + hainanCount + boardCount; // 4 = landing + 3 indexes
console.log(`\n✅ Total: ${total} pages generated → dist/`);
console.log('\nTo preview:');
console.log('  npx serve dist');
console.log('  — or —');
console.log('  cd dist && python3 -m http.server 3000');
