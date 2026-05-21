import { db, BaliSpots, HainanSpots, Boards, AustraliaSpots, TaiwanSpots, BigWaveBoards, JapanSpots, KoreaSpots } from 'astro:db';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function() {
  console.log('Seeding database from JSON files...');

  // Clear all tables so re-running the seed is idempotent (avoids
  // UNIQUE constraint failures on existing remote rows).
  await db.delete(BaliSpots);
  await db.delete(HainanSpots);
  await db.delete(Boards);
  await db.delete(AustraliaSpots);
  await db.delete(TaiwanSpots);
  await db.delete(BigWaveBoards);
  await db.delete(JapanSpots);
  await db.delete(KoreaSpots);

  // Helpers
  function slugify(key) {
    return key.toLowerCase().replace(/_/g, '-');
  }

  // Seed Bali Spots
  const baliRaw = JSON.parse(readFileSync(join(process.cwd(), 'project/data/bali.json'), 'utf-8'));
  const baliData = [];
  
  for (const [key, data] of Object.entries(baliRaw)) {
    const isNested = 'basic_info' in data;
    const slug = slugify(key);
    
    let name = '';
    let category = '';
    let region = '';

    if (isNested) {
      const bi = data.basic_info || {};
      name = bi.name || key.replace(/_/g, ' ');
      category = bi.category || '';
      region = bi.region || '';
    } else {
      name = data.name || key.replace(/_/g, ' ');
      category = data.category || '';
      region = data.region || '';
    }
    
    const iP = name.indexOf(' (');
    const shortName = iP > 0 ? name.slice(0, iP).trim() : name.trim();

    baliData.push({
      id: slug,
      name: shortName,
      category,
      region,
      // bali.js does SERVICE_KEYS.has(key) with original capitalized keys
      // (Surf_Schools, Season_Safety_Medical, …) — preserve _key so the
      // API can return the original form (same pattern as AU/TW/JP/KR).
      content: { ...data, _key: key }
    });
  }

  await db.insert(BaliSpots).values(baliData);
  console.log(`Seeded ${baliData.length} Bali spots.`);

  // Seed Hainan Spots
  const hainanRaw = JSON.parse(readFileSync(join(process.cwd(), 'project/data/hainan.json'), 'utf-8'));
  const hainanData = [];
  
  for (const [key, data] of Object.entries(hainanRaw)) {
    const slug = slugify(key);
    const bi = data.basic_info || {};
    const name = bi.name || key;
    const category = bi.category || '';
    const status = bi.status || '';

    hainanData.push({
      id: slug,
      name,
      category,
      status,
      content: data
    });
  }
  
  await db.insert(HainanSpots).values(hainanData);
  console.log(`Seeded ${hainanData.length} Hainan spots.`);

  // Seed Boards
  const boardsRaw = JSON.parse(readFileSync(join(process.cwd(), 'project/data/board.json'), 'utf-8'));
  const boardsData = [];
  
  for (const [key, data] of Object.entries(boardsRaw)) {
    const slug = slugify(key);
    const bi = data.basic_info || {};
    const nameRaw = bi['名稱'] || key;
    const fit = bi['適用程度'] || '';
    const group = key[0] || '';

    const iP = nameRaw.indexOf(' (');
    const shortName = iP > 0 ? nameRaw.slice(0, iP).trim() : nameRaw.trim();

    boardsData.push({
      id: slug,
      name: `${key} · ${shortName}`,
      group,
      fit,
      content: data
    });
  }
  
  await db.insert(Boards).values(boardsData);
  console.log(`Seeded ${boardsData.length} Boards.`);

  // Seed Australia Spots
  const ausRaw = JSON.parse(readFileSync(join(process.cwd(), 'project/data/australia.json'), 'utf-8'));
  const ausData = [];

  for (const [key, data] of Object.entries(ausRaw) as [string, any][]) {
    const slug = slugify(key);
    const name = data.name || key.replace(/_/g, ' ');
    const category = data.category || '';
    const region = data.region || '';

    const iP = name.indexOf(' (');
    const shortName = iP > 0 ? name.slice(0, iP).trim() : name.trim();

    ausData.push({
      id: slug,
      name: shortName,
      category,
      region,
      // Preserve the original JSON key (e.g. Snapper_Rocks) so the API can
      // re-key the response — australia.js does exact-match lookups
      // (SERVICE_KEYS, hard-coded practical list) against the original form.
      content: { ...data, _key: key }
    });
  }

  await db.insert(AustraliaSpots).values(ausData);
  console.log(`Seeded ${ausData.length} Australia spots.`);

  // Seed Taiwan Spots
  const twRaw = JSON.parse(readFileSync(join(process.cwd(), 'project/data/taiwan.json'), 'utf-8'));
  const twData = [];

  for (const [key, data] of Object.entries(twRaw) as [string, any][]) {
    const slug = slugify(key);
    const name = data.name || key.replace(/_/g, ' ');
    const category = data.category || '';
    const region = data.region || '';

    const iP = name.indexOf(' (');
    const shortName = iP > 0 ? name.slice(0, iP).trim() : name.trim();

    twData.push({
      id: slug,
      name: shortName,
      category,
      region,
      // taiwan.js shares australia.js's SERVICE_KEYS / exact-match pattern.
      content: { ...data, _key: key }
    });
  }

  await db.insert(TaiwanSpots).values(twData);
  console.log(`Seeded ${twData.length} Taiwan spots.`);

  // Seed Big Wave Boards (same shape as Boards: A1..E? keys with basic_info nesting)
  const bigRaw = JSON.parse(readFileSync(join(process.cwd(), 'project/data/bigwave.json'), 'utf-8'));
  const bigData = [];

  for (const [key, data] of Object.entries(bigRaw) as [string, any][]) {
    const slug = slugify(key);
    const bi = data.basic_info || {};
    const nameRaw = bi['名稱'] || key;
    const fit = bi['適用程度'] || '';
    const group = key[0] || '';

    const iP = nameRaw.indexOf(' (');
    const shortName = iP > 0 ? nameRaw.slice(0, iP).trim() : nameRaw.trim();

    bigData.push({
      id: slug,
      name: `${key} · ${shortName}`,
      group,
      fit,
      // bigwave.js does GROUP_MAP[key[0]] with the original capitalized key,
      // same shape as boards. Preserve _key so the API can return A1/B2/...
      content: { ...data, _key: key }
    });
  }

  await db.insert(BigWaveBoards).values(bigData);
  console.log(`Seeded ${bigData.length} Big Wave boards.`);

  // Seed Japan Spots
  const jpRaw = JSON.parse(readFileSync(join(process.cwd(), 'project/data/japan.json'), 'utf-8'));
  const jpData = [];

  for (const [key, data] of Object.entries(jpRaw) as [string, any][]) {
    const slug = slugify(key);
    const name = data.name || key.replace(/_/g, ' ');
    const category = data.category || '';
    const region = data.region || '';

    const iP = name.indexOf(' (');
    const shortName = iP > 0 ? name.slice(0, iP).trim() : name.trim();

    jpData.push({
      id: slug,
      name: shortName,
      category,
      region,
      content: { ...data, _key: key }
    });
  }

  await db.insert(JapanSpots).values(jpData);
  console.log(`Seeded ${jpData.length} Japan spots.`);

  // Seed Korea Spots
  const krRaw = JSON.parse(readFileSync(join(process.cwd(), 'project/data/korea.json'), 'utf-8'));
  const krData = [];

  for (const [key, data] of Object.entries(krRaw) as [string, any][]) {
    const slug = slugify(key);
    const name = data.name || key.replace(/_/g, ' ');
    const category = data.category || '';
    const region = data.region || '';

    const iP = name.indexOf(' (');
    const shortName = iP > 0 ? name.slice(0, iP).trim() : name.trim();

    krData.push({
      id: slug,
      name: shortName,
      category,
      region,
      content: { ...data, _key: key }
    });
  }

  await db.insert(KoreaSpots).values(krData);
  console.log(`Seeded ${krData.length} Korea spots.`);
  console.log('Seeding complete.');
}
