import { db, BaliSpots } from 'astro:db';

export async function GET() {
  const spots = await db.select().from(BaliSpots);
  
  const data: Record<string, unknown> = {};
  for (const spot of spots) {
    const content = (spot.content ?? {}) as Record<string, unknown>;
    // Seed preserves the original JSON key (Surf_Schools, Uluwatu, …) as
    // content._key. bali.js does exact-match SERVICE_KEYS lookups against
    // that original form; falling back to spot.id would return slugs and
    // break the practical/service classification.
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
