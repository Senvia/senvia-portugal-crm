// Deeper checks against the NEW project via direct SQL.
// Run: DB_URL='postgresql://...' node migration/scripts/verify-sql.mjs
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const q = async (label, sql) => {
  try { const r = await c.query(sql); console.log(`\n== ${label} ==`); console.log(JSON.stringify(r.rows, null, 0)); }
  catch (e) { console.log(`\n== ${label} ==\nERR ${e.message}`); }
};

await q('Funcoes que AINDA apontam para o ref ANTIGO (devem ser 0)',
  `select n.nspname||'.'||p.proname as obj
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where p.prosrc like '%zppcobirzgpfcrnxznwe%'`);

await q('Cron jobs no projeto novo',
  `select jobid, jobname, schedule,
          (command like '%zppcobirzgpfcrnxznwe%') as aponta_ref_antigo
   from cron.job order by jobid`);

await q('Realtime: nº de tabelas na publication',
  `select count(*) as tabelas from pg_publication_tables where pubname='supabase_realtime'`);

await q('Extensões instaladas',
  `select extname from pg_extension order by extname`);

await q('Grants para anon/authenticated em public (amostra)',
  `select grantee, count(*) as tabelas
   from information_schema.role_table_grants
   where table_schema='public' and grantee in ('anon','authenticated','service_role')
   group by grantee order by grantee`);

await c.end();
