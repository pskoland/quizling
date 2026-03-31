import { NextRequest } from 'next/server';
import { getLagnavn, addLagnavn, initLagnavnBank } from '@/lib/lagnavn-bank';
import { checkAdminAuth } from '@/lib/admin-auth';

async function ensureTable() {
  try {
    await initLagnavnBank();
  } catch {
    // already exists or non-fatal
  }
}

export async function GET(request: NextRequest) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  await ensureTable();
  try {
    const rows = await getLagnavn();
    return Response.json(rows);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  await ensureTable();
  try {
    const body = await request.json();
    const { name } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return Response.json({ error: 'Missing name' }, { status: 400 });
    }
    const row = await addLagnavn(name.trim());
    return Response.json(row, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 400 });
  }
}
