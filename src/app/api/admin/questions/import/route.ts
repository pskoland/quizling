import { NextRequest } from 'next/server';
import { addQuestion, findDuplicate, questionHash } from '@/lib/question-bank';
import { checkAdminAuth } from '@/lib/admin-auth';

interface ImportRow {
  type: string;
  question: string;
  answer: string;
  difficulty: string;
}

function parseCsv(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Detect separator: tab, semicolon, or comma
  const header = lines[0].toLowerCase();
  const sep = header.includes('\t') ? '\t' : header.includes(';') ? ';' : ',';

  const cols = header.split(sep).map(c => c.replace(/"/g, '').trim());
  const qIdx = cols.indexOf('question');
  const aIdx = cols.indexOf('answer');
  const tIdx = cols.indexOf('type');
  const dIdx = cols.indexOf('difficulty');

  if (qIdx === -1 || aIdx === -1) return [];

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], sep);
    const question = values[qIdx]?.trim();
    const answer = values[aIdx]?.trim();
    if (!question || !answer) continue;

    rows.push({
      type: (tIdx !== -1 ? values[tIdx]?.trim() : '') || 'quiz',
      question,
      answer,
      difficulty: (dIdx !== -1 ? values[dIdx]?.trim() : '') || 'medium',
    });
  }
  return rows;
}

function parseCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

export async function POST(request: NextRequest) {
  const authErr = checkAdminAuth(request);
  if (authErr) return authErr;

  try {
    const contentType = request.headers.get('content-type') || '';
    let csvText: string;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 });
      csvText = await file.text();
    } else {
      const body = await request.json();
      csvText = body.csv;
      if (!csvText) return Response.json({ error: 'No CSV data' }, { status: 400 });
    }

    // Strip BOM
    if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);

    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      return Response.json({ error: 'No valid rows found. CSV must have "question" and "answer" columns.' }, { status: 400 });
    }

    let added = 0;
    let skippedDuplicates = 0;
    const errors: string[] = [];
    const duplicates: string[] = [];

    for (const row of rows) {
      try {
        const existing = await findDuplicate(row.question, row.answer);
        if (existing) {
          skippedDuplicates++;
          duplicates.push(row.question.slice(0, 60));
          continue;
        }
        await addQuestion(row.type, row.question, row.answer, row.difficulty);
        added++;
      } catch (e) {
        errors.push(`Row "${row.question.slice(0, 40)}": ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    return Response.json({
      total: rows.length,
      added,
      skippedDuplicates,
      duplicates: duplicates.slice(0, 10),
      errors: errors.slice(0, 10),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
