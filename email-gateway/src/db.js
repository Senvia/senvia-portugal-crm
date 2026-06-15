// Postgres pool. The gateway writes synced email directly (it runs server-side
// with full DB access; RLS is for the browser, not for this worker).
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL no ambiente (.env ou variável de ambiente).');
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
});

export async function q(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}
