import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS
      'SELECT current_setting(''request.jwt.claim.role'',true)';
    CREATE TABLE public.automation_queue(id uuid PRIMARY KEY, scheduled_for timestamptz, status text);
    INSERT INTO public.automation_queue VALUES
      ('00000000-0000-4000-8000-000000000001',now()-interval '1 minute','pending'),
      ('00000000-0000-4000-8000-000000000002',now()+interval '1 hour','pending'),
      ('00000000-0000-4000-8000-000000000003',now()-interval '1 minute','failed');
  `);
  const migration = await readFile(new URL('../supabase/migrations/20260911120000_security_jobs.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(db.query('SELECT * FROM public.claim_automation_queue(50)'), /permission denied/);
    await db.exec('RESET ROLE');
  }
  await db.exec("SELECT set_config('request.jwt.claim.role','service_role',false); SET ROLE service_role");
  const first = await db.query('SELECT * FROM public.claim_automation_queue(50)');
  assert.equal(first.rows.length, 1);
  assert.equal(first.rows[0].status, 'processing');
  assert.equal((await db.query('SELECT * FROM public.claim_automation_queue(50)')).rows.length, 0);
  await db.exec('RESET ROLE');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.automation_queue WHERE status='failed'")).rows[0].n, 1);
  console.log('PASS queue migration: client ACL, atomic transition, due filtering, no automatic replay of claimed/failed items');
} finally { await db.close(); }
