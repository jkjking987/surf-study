import { db, BigWaveBoards } from 'astro:db';

export async function GET() {
  const spots = await db.select().from(BigWaveBoards);

  const data: Record<string, unknown> = {};
  for (const spot of spots) {
    const content = (spot.content ?? {}) as Record<string, unknown>;
    // Seed preserved the original key (A1, B2, …) as content._key so
    // bigwave.js can do GROUP_MAP[key[0]] with the uppercase letter.
    const responseKey = (content._key as string) ?? spot.id.toUpperCase();
    data[responseKey] = content;
  }

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60'
    }
  });
}
