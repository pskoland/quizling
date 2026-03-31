import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';

const HEADER = 'x-admin-password';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function checkAdminAuth(request: NextRequest | Request): Response | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return Response.json(
      { error: 'ADMIN_PASSWORD not configured' },
      { status: 500 },
    );
  }

  const provided = request.headers.get(HEADER);
  if (!provided || !safeCompare(provided, password)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // auth OK
}
