import { db, BaliSpots, HainanSpots, Boards } from 'astro:db';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function() {
  console.log('Seeding database from JSON files...');
  
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
      content: data
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
  console.log('Seeding complete.');
}
