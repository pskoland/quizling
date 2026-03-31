import { NextRequest } from 'next/server';
import { getQuestions, QuestionRow } from '@/lib/question-bank';
import { checkAdminAuth } from '@/lib/admin-auth';

const ALL_FIELDS = ['id', 'type', 'question', 'answer', 'difficulty', 'times_shown', 'times_correct', 'times_wrong', 'content_hash', 'created_at'] as const;
type Field = typeof ALL_FIELDS[number];

const fieldExtractor: Record<Field, (q: QuestionRow) => string> = {
  id: q => String(q.id),
  type: q => q.type,
  question: q => q.question,
  answer: q => q.answer,
  difficulty: q => q.difficulty,
  times_shown: q => String(q.times_shown ?? 0),
  times_correct: q => String(q.times_correct ?? 0),
  times_wrong: q => String(q.times_wrong ?? 0),
  content_hash: q => q.content_hash || '',
  created_at: q => q.created_at,
};

function escapeCsv(val: string, sep: string): string {
  if (val.includes(sep) || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export async function GET(request: NextRequest) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  try {
    const { searchParams } = request.nextUrl;
    const format = searchParams.get('format') || 'csv';
    const type = searchParams.get('type') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const fieldsParam = searchParams.get('fields');

    const questions = await getQuestions(type, difficulty);

    // Parse requested fields, defaulting to the basic set
    const defaultFields: Field[] = ['type', 'question', 'answer', 'difficulty'];
    const fields: Field[] = fieldsParam
      ? fieldsParam.split(',').filter((f): f is Field => ALL_FIELDS.includes(f as Field))
      : defaultFields;

    if (fields.length === 0) {
      return Response.json({ error: 'No valid fields specified' }, { status: 400 });
    }

    const rows = questions.map(q => fields.map(f => fieldExtractor[f](q)));

    const sep = format === 'excel' ? '\t' : ';';
    const content = [
      fields.join(sep),
      ...rows.map(r => r.map(v => escapeCsv(v, sep)).join(sep)),
    ].join('\n');

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'excel') {
      return new Response('\uFEFF' + content, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="questions-${dateStr}.xls"`,
        },
      });
    }

    return new Response('\uFEFF' + content, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="questions-${dateStr}.csv"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
