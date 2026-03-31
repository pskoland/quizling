import { NextRequest } from 'next/server';
import { getQuestions } from '@/lib/question-bank';
import { checkAdminAuth } from '@/lib/admin-auth';

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
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

    const questions = await getQuestions(type, difficulty);

    const headers = ['id', 'type', 'question', 'answer', 'difficulty', 'content_hash', 'times_shown', 'times_correct', 'times_wrong', 'created_at'];
    const rows = questions.map(q => [
      String(q.id),
      q.type,
      q.question,
      q.answer,
      q.difficulty,
      q.content_hash || '',
      String(q.times_shown ?? 0),
      String(q.times_correct ?? 0),
      String(q.times_wrong ?? 0),
      q.created_at,
    ]);

    if (format === 'csv') {
      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(escapeCsv).join(',')),
      ].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="questions-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Excel-compatible TSV (opens directly in Excel)
    const tsv = [
      headers.join('\t'),
      ...rows.map(r => r.join('\t')),
    ].join('\n');

    return new Response('\uFEFF' + tsv, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="questions-${new Date().toISOString().slice(0, 10)}.xls"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
