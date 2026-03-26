import { NextRequest } from 'next/server';
import { updateQuestion, deleteQuestion } from '@/lib/question-bank';
import { checkAdminAuth } from '@/lib/admin-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await request.json();
    const { type, question, answer, difficulty } = body;
    const row = await updateQuestion(Number(id), { type, question, answer, difficulty });
    if (!row) {
      return Response.json({ error: 'Question not found' }, { status: 404 });
    }
    return Response.json(row);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const row = await deleteQuestion(Number(id));
    if (!row) {
      return Response.json({ error: 'Question not found' }, { status: 404 });
    }
    return Response.json(row);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
