import { NextRequest } from 'next/server';

const HEADER = 'x-admin-password';

export function checkAdminAuth(request: NextRequest | Request): Response | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return Response.json(
      { error: 'ADMIN_PASSWORD not configured' },
      { status: 500 },
    );
  }

  const provided = request.headers.get(HEADER);

  if (provided !== password) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // auth OK
}
