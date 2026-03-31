import { NextRequest } from 'next/server';
import { getQuestions } from '@/lib/question-bank';
import { checkAdminAuth } from '@/lib/admin-auth';

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
    const full = searchParams.get('full') === '1';

    const questions = await getQuestions(type, difficulty);

    // Simple export: just the fields needed for editing/reimporting
    // Full export: includes stats and metadata
    const headers = full
      ? ['id', 'type', 'question', 'answer', 'difficulty', 'times_shown', 'times_correct', 'times_wrong']
      : ['type', 'question', 'answer', 'difficulty'];

    const rows = questions.map(q => {
      if (full) {
        return [
          String(q.id),
          q.type,
          q.question,
          q.answer,
          q.difficulty,
          String(q.times_shown ?? 0),
          String(q.times_correct ?? 0),
          String(q.times_wrong ?? 0),
        ];
      }
      return [q.type, q.question, q.answer, q.difficulty];
    });

    // Use semicolon for CSV (Norwegian Excel default) and tab for Excel
    const sep = format === 'excel' ? '\t' : ';';
    const content = [
      headers.join(sep),
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
