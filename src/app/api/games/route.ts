import { NextResponse } from 'next/server';
import { createGame, startGame } from '@/lib/game-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hostName, hostId, action } = body;

    if (action === 'create') {
      if (!hostName || !hostId) {
        return NextResponse.json({ error: 'Missing hostName or hostId' }, { status: 400 });
      }
      const game = await createGame(hostName, hostId);
      return NextResponse.json({ code: game.code });
    }

    if (action === 'start') {
      const { code, seenHashes } = body;
      if (!code || !hostId) {
        return NextResponse.json({ error: 'Missing code or hostId' }, { status: 400 });
      }
      await startGame(code, hostId, Array.isArray(seenHashes) ? seenHashes : undefined);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
