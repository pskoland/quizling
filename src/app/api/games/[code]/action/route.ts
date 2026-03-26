import { NextResponse } from 'next/server';
import { processAction } from '@/lib/game-store';
import { GameAction } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const action: GameAction = {
      type: body.type,
      playerId: body.playerId,
      payload: body.payload,
    };

    await processAction(code, action);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
