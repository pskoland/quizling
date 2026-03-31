import { neon } from '@neondatabase/serverless';

export const useDb = () => !!process.env.DATABASE_URL;

let _sql: ReturnType<typeof neon> | null = null;

/** Cached Neon SQL client — reuses connection across calls */
export function getSql() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL!);
  }
  return _sql!;
}

export async function initSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS games (
      code TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      updated_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `;
}
