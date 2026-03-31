import { getSql } from './db';

export interface LagnavnRow {
  id: number;
  name: string;
  created_at: string;
}

export async function initLagnavnBank(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS lagnavn_bank (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function getLagnavn(): Promise<LagnavnRow[]> {
  const sql = getSql();
  return (await sql`SELECT * FROM lagnavn_bank ORDER BY created_at DESC`) as LagnavnRow[];
}

export async function getLagnavnRandom(count: number): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT name FROM lagnavn_bank ORDER BY RANDOM() LIMIT ${count}
  `) as { name: string }[];
  return rows.map(r => r.name);
}

export async function addLagnavn(name: string): Promise<LagnavnRow> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO lagnavn_bank (name) VALUES (${name})
    ON CONFLICT (name) DO NOTHING
    RETURNING *
  `) as LagnavnRow[];
  if (rows.length === 0) throw new Error(`"${name}" finnes allerede`);
  return rows[0];
}

export async function deleteLagnavn(id: number): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM lagnavn_bank WHERE id = ${id}`;
}
