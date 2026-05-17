import { db, TaiwanSpots } from 'astro:db';

export async function GET() {
  const spots = await db.select().from(TaiwanSpots);

  const data: Record<string, unknown> = {};
  for (const spot of spots) {
    const content = (spot.content ?? {}) as Record<string, unknown>;
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
