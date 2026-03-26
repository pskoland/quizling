import { NextRequest } from 'next/server';
import { initQuestionBank } from '@/lib/question-bank';
import { checkAdminAuth } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  try {
    await initQuestionBank();
    return Response.json({ ok: true, message: 'question_bank table created' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
