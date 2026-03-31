import { NextRequest } from 'next/server';
import { deleteLagnavn } from '@/lib/lagnavn-bank';
import { checkAdminAuth } from '@/lib/admin-auth';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    await deleteLagnavn(parseInt(id));
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
