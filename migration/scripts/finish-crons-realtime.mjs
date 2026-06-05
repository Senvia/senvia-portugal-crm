// Recreates the 12 cron jobs + realtime publication on the NEW project,
// pointing every cron at the NEW functions URL + NEW anon key.
// Run: DB_URL=... NEW_ANON=... node migration/scripts/finish-crons-realtime.mjs
import pg from 'pg';
const { DB_URL, NEW_ANON } = process.env;
if (!DB_URL || !NEW_ANON) { console.error('missing env'); process.exit(1); }
const BASE = 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/';

const c = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const q = s => "'" + s.replace(/'/g, "''") + "'";
const run = async (label, sql) => {
  try { await c.query(sql); console.log('OK   ' + label); }
  catch (e) { console.log('ERR  ' + label + ': ' + e.message); }
};

const H = `'{"Content-Type":"application/json","Authorization":"Bearer ${NEW_ANON}"}'::jsonb`;
const cmd = (fn, body = '') => {
  let b = '';
  if (body === 'sync_all') b = `body:='{"sync_all":true}'::jsonb, `;
  else if (body === 'time') b = `body:=jsonb_build_object('time', now()::text), `;
  return `select net.http_post(url:='${BASE}${fn}', ${b}headers:=${H});`;
};

// [jobname, schedule, function, bodyType]
const jobs = [
  ['check-event-reminders',                '* * * * *',   'check-reminders'],
  ['check-fidelization-alerts-daily',      '0 9 * * *',   'check-fidelization-alerts'],
  ['sync-credit-notes-hourly',             '0 * * * *',   'sync-credit-notes',          'sync_all'],
  ['sync-invoices-hourly',                 '30 * * * *',  'sync-invoices',              'sync_all'],
  ['cleanup-expired-trials-daily',         '0 3 * * *',   'cleanup-expired-trials'],
  ['process-automation-queue',             '* * * * *',   'process-automation-queue',   'time'],
  ['check-trial-status-daily',             '0 8 * * *',   'check-trial-status'],
  ['sync-email-statuses-every-5min',       '*/5 * * * *', 'sync-email-statuses'],
  ['process-scheduled-campaigns',          '* * * * *',   'process-scheduled-campaigns','time'],
  ['check-renewal-automations-every-day',  '0 8 * * *',   'check-renewal-automations'],
  ['generate-recurring-expenses',          '0 6 * * *',   'generate-recurring-expenses'],
  ['reconcile-plans-daily',                '0 3 * * *',   'reconcile-plans'],
];

console.log('== Realtime ==');
await run('add tables to supabase_realtime',
  'alter publication supabase_realtime add table public.leads, public.proposals, public.sales, public.proposal_cpes;');

console.log('\n== Cron jobs ==');
for (const [name, sched, fn, body] of jobs) {
  await run(name, `select cron.schedule(${q(name)}, ${q(sched)}, ${q(cmd(fn, body))});`);
}

console.log('\n== Verify ==');
const { rows: crons } = await c.query(
  "select jobname, schedule, (command like '%chhmfwlimtbsyjmgtokn%') as aponta_novo from cron.job order by jobid");
console.log('cron.job (' + crons.length + '):');
for (const r of crons) console.log('  ', r.jobname.padEnd(36), r.schedule.padEnd(12), 'novo=' + r.aponta_novo);
const { rows: rt } = await c.query(
  "select schemaname||'.'||tablename t from pg_publication_tables where pubname='supabase_realtime' order by 1");
console.log('realtime:', rt.map(x => x.t).join(', '));
await c.end();
