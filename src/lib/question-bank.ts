import { getSql } from './db';
import { createHash } from 'crypto';

export interface QuestionRow {
  id: number;
  type: string;
  question: string;
  answer: string;
  difficulty: string;
  content_hash: string;
  times_shown: number;
  times_correct: number;
  times_wrong: number;
  created_at: string;
}

/** Stable hash of question text for duplicate detection */
export function questionHash(question: string, answer: string): string {
  const normalized = `${question.trim().toLowerCase()}::${answer.trim().toLowerCase()}`;
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export async function initQuestionBank(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS question_bank (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'quiz',
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      content_hash TEXT,
      times_shown INTEGER NOT NULL DEFAULT 0,
      times_correct INTEGER NOT NULL DEFAULT 0,
      times_wrong INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  // Add columns if they don't exist (for existing databases)
  await sql`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS content_hash TEXT`.catch(() => {});
  await sql`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS times_shown INTEGER NOT NULL DEFAULT 0`.catch(() => {});
  await sql`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS times_correct INTEGER NOT NULL DEFAULT 0`.catch(() => {});
  await sql`ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS times_wrong INTEGER NOT NULL DEFAULT 0`.catch(() => {});
  // Backfill content_hash for existing rows
  await sql`
    UPDATE question_bank SET content_hash = 'legacy-' || id
    WHERE content_hash IS NULL
  `.catch(() => {});
}

export async function getQuestions(
  type?: string,
  difficulty?: string,
): Promise<QuestionRow[]> {
  const sql = getSql();

  if (type && difficulty) {
    return (await sql`
      SELECT * FROM question_bank
      WHERE type = ${type} AND difficulty = ${difficulty}
      ORDER BY created_at DESC
    `) as QuestionRow[];
  }
  if (type) {
    return (await sql`
      SELECT * FROM question_bank WHERE type = ${type}
      ORDER BY created_at DESC
    `) as QuestionRow[];
  }
  if (difficulty) {
    return (await sql`
      SELECT * FROM question_bank WHERE difficulty = ${difficulty}
      ORDER BY created_at DESC
    `) as QuestionRow[];
  }
  return (await sql`
    SELECT * FROM question_bank ORDER BY created_at DESC
  `) as QuestionRow[];
}

export async function getQuestionsRandom(type: string, count: number, difficulty?: string, excludeHashes?: string[]): Promise<QuestionRow[]> {
  const sql = getSql();
  const hasExclusions = excludeHashes && excludeHashes.length > 0;

  // Prefer least-shown questions, with optional exclusion of recent ones.
  // times_shown ASC ensures we rotate through the full bank before repeating.
  if (hasExclusions) {
    const rows = difficulty
      ? ((await sql`
          SELECT * FROM question_bank
          WHERE type = ${type} AND difficulty = ${difficulty}
            AND (content_hash IS NULL OR content_hash NOT IN ${sql(excludeHashes!)})
          ORDER BY times_shown ASC, RANDOM() LIMIT ${count}
        `) as QuestionRow[])
      : ((await sql`
          SELECT * FROM question_bank
          WHERE type = ${type}
            AND (content_hash IS NULL OR content_hash NOT IN ${sql(excludeHashes!)})
          ORDER BY times_shown ASC, RANDOM() LIMIT ${count}
        `) as QuestionRow[]);

    if (rows.length >= count) return rows;
    // Fall through without exclusion if pool is too small
  }

  if (difficulty) {
    return (await sql`
      SELECT * FROM question_bank
      WHERE type = ${type} AND difficulty = ${difficulty}
      ORDER BY times_shown ASC, RANDOM() LIMIT ${count}
    `) as QuestionRow[];
  }
  return (await sql`
    SELECT * FROM question_bank
    WHERE type = ${type}
    ORDER BY times_shown ASC, RANDOM() LIMIT ${count}
  `) as QuestionRow[];
}

export async function addQuestion(
  type: string,
  question: string,
  answer: string,
  difficulty: string,
): Promise<QuestionRow> {
  const sql = getSql();
  const hash = questionHash(question, answer);
  const rows = (await sql`
    INSERT INTO question_bank (type, question, answer, difficulty, content_hash)
    VALUES (${type}, ${question}, ${answer}, ${difficulty}, ${hash})
    RETURNING *
  `) as QuestionRow[];
  return rows[0];
}

/** Check if a question with the same content_hash already exists */
export async function findDuplicate(question: string, answer: string): Promise<QuestionRow | null> {
  const sql = getSql();
  const hash = questionHash(question, answer);
  const rows = (await sql`
    SELECT * FROM question_bank WHERE content_hash = ${hash} LIMIT 1
  `) as QuestionRow[];
  return rows[0] ?? null;
}

/** Increment answer stats for questions matched by text */
export async function recordQuestionResult(
  questionText: string,
  answerText: string,
  correct: boolean,
): Promise<void> {
  const sql = getSql();
  if (correct) {
    await sql`
      UPDATE question_bank
      SET times_shown = times_shown + 1, times_correct = times_correct + 1
      WHERE LOWER(TRIM(question)) = LOWER(TRIM(${questionText}))
        AND LOWER(TRIM(answer)) = LOWER(TRIM(${answerText}))
    `;
  } else {
    await sql`
      UPDATE question_bank
      SET times_shown = times_shown + 1, times_wrong = times_wrong + 1
      WHERE LOWER(TRIM(question)) = LOWER(TRIM(${questionText}))
        AND LOWER(TRIM(answer)) = LOWER(TRIM(${answerText}))
    `;
  }
}

export async function updateQuestion(
  id: number,
  fields: Partial<Pick<QuestionRow, 'type' | 'question' | 'answer' | 'difficulty'>>,
): Promise<QuestionRow> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE question_bank SET
      type = COALESCE(${fields.type ?? null}, type),
      question = COALESCE(${fields.question ?? null}, question),
      answer = COALESCE(${fields.answer ?? null}, answer),
      difficulty = COALESCE(${fields.difficulty ?? null}, difficulty)
    WHERE id = ${id}
    RETURNING *
  `) as QuestionRow[];
  // Update content_hash separately (column may not exist in older schemas)
  if (rows[0] && (fields.question || fields.answer)) {
    const newHash = questionHash(rows[0].question, rows[0].answer);
    await sql`
      UPDATE question_bank SET content_hash = ${newHash} WHERE id = ${id}
    `.catch(() => {});
  }
  return rows[0];
}

export async function deleteQuestion(id: number): Promise<QuestionRow> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM question_bank WHERE id = ${id} RETURNING *
  `) as QuestionRow[];
  return rows[0];
}

export async function deleteAllQuestions(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`DELETE FROM question_bank RETURNING id`) as { id: number }[];
  return rows.length;
}
