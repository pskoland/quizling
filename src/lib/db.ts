import { neon } from '@neondatabase/serverless';

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url);
}

export async function initSchema() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS games (
      code TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      updated_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `;
}
