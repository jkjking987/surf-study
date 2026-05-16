import { db, Boards } from 'astro:db';

export async function GET() {
  const spots = await db.select().from(Boards);
  
  const data = {};
  for (const spot of spots) {
    data[spot.id] = spot.content;
  }
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60'
    }
  });
}
