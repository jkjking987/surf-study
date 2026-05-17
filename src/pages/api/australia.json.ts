import { db, AustraliaSpots } from 'astro:db';

export async function GET() {
  const spots = await db.select().from(AustraliaSpots);

  const data: Record<string, unknown> = {};
  for (const spot of spots) {
    const content = (spot.content ?? {}) as Record<string, unknown>;
    // Seed preserved the original key (e.g. Snapper_Rocks) as content._key
    // because australia.js does exact-match lookups against it.
    const responseKey = (content._key as string) ?? spot.id;
    data[responseKey] = content;
  }

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60'
    }
  });
}
