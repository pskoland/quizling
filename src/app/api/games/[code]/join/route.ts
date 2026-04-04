import { NextResponse } from 'next/server';
import { joinGame } from '@/lib/game-store';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { playerName, playerId, deviceId } = body;

    if (!playerName || !playerId) {
      return NextResponse.json({ error: 'Missing playerName or playerId' }, { status: 400 });
    }

    await joinGame(code, playerName, playerId, deviceId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
