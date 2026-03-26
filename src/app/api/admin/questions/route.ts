import { NextRequest } from 'next/server';
import { getQuestions, addQuestion } from '@/lib/question-bank';
import { checkAdminAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const questions = await getQuestions(type, difficulty);
    return Response.json(questions);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { type, question, answer, difficulty } = body;

    if (!question || !answer) {
      return Response.json({ error: 'Missing question or answer' }, { status: 400 });
    }

    const row = await addQuestion(
      type || 'quiz',
      question,
      answer,
      difficulty || 'medium',
    );
    return Response.json(row, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
