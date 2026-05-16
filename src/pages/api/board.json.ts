import { db, Boards } from 'astro:db';

export async function GET() {
  const spots = await db.select().from(Boards);
  
  const data: Record<string, unknown> = {};
  for (const spot of spots) {
    // Seed slugified the original JSON keys (A1 → a1) for URL friendliness,
    // but the front-end (public/scripts/board.js) keys GROUP_MAP off the
    // uppercase letter — return uppercase here to keep that contract.
    data[spot.id.toUpperCase()] = spot.content;
  }
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60'
    }
  });
}
