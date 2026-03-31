import { NextRequest } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { getGameStats, initGameStats } from '@/lib/game-stats';

export async function GET(request: NextRequest) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  try {
    const stats = await getGameStats();
    if (!stats) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }
    return Response.json(stats);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  try {
    await initGameStats();
    return Response.json({ ok: true, message: 'game_stats table created' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
