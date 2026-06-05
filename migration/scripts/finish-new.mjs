// Enables pg_net + pg_cron and patches functions that still reference the OLD ref.
// Run: DB_URL=... OLD_ANON=... NEW_ANON=... node migration/scripts/finish-new.mjs
import pg from 'pg';
const { DB_URL, OLD_ANON, NEW_ANON } = process.env;
const OLD_REF = 'zppcobirzgpfcrnxznwe', NEW_REF = 'chhmfwlimtbsyjmgtokn';
if (!DB_URL || !OLD_ANON || !NEW_ANON) { console.error('missing env'); process.exit(1); }

const c = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const run = async (label, sql) => {
  try { await c.query(sql); console.log('OK   ' + label); }
  catch (e) { console.log('ERR  ' + label + ': ' + e.message); }
};

await run('pg_net',  'create extension if not exists pg_net with schema extensions;');
await run('pg_cron', 'create extension if not exists pg_cron;');

const patch = `DO $$
DECLARE r record; newdef text; cnt int := 0;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE p.prosrc LIKE '%${OLD_REF}%' LOOP
    newdef := pg_get_functiondef(r.oid);
    newdef := replace(newdef, '${OLD_REF}', '${NEW_REF}');
    newdef := replace(newdef, '${OLD_ANON}', '${NEW_ANON}');
    EXECUTE newdef;
    cnt := cnt + 1;
  END LOOP;
  RAISE NOTICE 'patched % functions', cnt;
END $$;`;
await run('patch refs antigos', patch);

const { rows: still } = await c.query(
  "select n.nspname||'.'||p.proname obj from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prosrc like '%" + OLD_REF + "%'");
console.log('\nainda com ref antigo (deve ser []):', JSON.stringify(still));
const { rows: ext } = await c.query(
  "select extname from pg_extension where extname in ('pg_net','pg_cron') order by extname");
console.log('extensoes net/cron:', JSON.stringify(ext));
await c.end();
