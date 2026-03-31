import { getSql } from './db';

export interface QuestionRow {
  id: number;
  type: string;
  question: string;
  answer: string;
  difficulty: string;
  created_at: string;
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
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
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

export async function getQuestionsRandom(type: string, count: number, difficulty?: string): Promise<QuestionRow[]> {
  const sql = getSql();
  if (difficulty) {
    return (await sql`
      SELECT * FROM question_bank
      WHERE type = ${type} AND difficulty = ${difficulty}
      ORDER BY RANDOM() LIMIT ${count}
    `) as QuestionRow[];
  }
  return (await sql`
    SELECT * FROM question_bank
    WHERE type = ${type}
    ORDER BY RANDOM() LIMIT ${count}
  `) as QuestionRow[];
}

export async function addQuestion(
  type: string,
  question: string,
  answer: string,
  difficulty: string,
): Promise<QuestionRow> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO question_bank (type, question, answer, difficulty)
    VALUES (${type}, ${question}, ${answer}, ${difficulty})
    RETURNING *
  `) as QuestionRow[];
  return rows[0];
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
  return rows[0];
}

export async function deleteQuestion(id: number): Promise<QuestionRow> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM question_bank WHERE id = ${id} RETURNING *
  `) as QuestionRow[];
  return rows[0];
}
