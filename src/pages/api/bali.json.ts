import { db, BaliSpots } from 'astro:db';

export async function GET() {
  const spots = await db.select().from(BaliSpots);
  
  // Reconstruct the original JSON shape expected by client scripts
  // Object keyed by original ID/slug
  const data = {};
  for (const spot of spots) {
    // spot.content is the original JSON object
    data[spot.id] = spot.content;
  }
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60'
    }
  });
}
