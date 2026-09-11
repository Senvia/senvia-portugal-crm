import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const source = async (path) => readFile(new URL(path, import.meta.url), 'utf8');
const scalar = async (sql) => Object.values((await db.query(sql)).rows[0])[0];
const userA = '20000000-0000-0000-0000-000000000001';
const userB = '20000000-0000-0000-0000-000000000002';
const orgA = '10000000-0000-0000-0000-000000000001';
const orgB = '10000000-0000-0000-0000-000000000002';
let checks = 0;
async function check(name, fn) {
  await fn();
  checks += 1;
  console.log(`PASS ${name}`);
}
async function asUser(user, aal = 'aal2') {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: user, aal, role: 'authenticated' })]);
  await db.exec('SET ROLE authenticated');
}
try {
  await db.exec(await source('./security-fixture.sql'));
  if (process.argv.includes('--baseline')) {
    await asUser(userA);
    assert.equal(await scalar(`SELECT has_function_privilege('authenticated','public.search_clients_unaccent(uuid,text,integer)','EXECUTE')`), false);
  }
  for (const name of ['20260911100000_security_authorization.sql', '20260911101000_security_business_policies.sql', '20260911102000_security_privileged_mutations.sql', '20260911103000_security_import_rpc.sql', '20260911104000_security_record_scope.sql', '20260911123000_security_mfa_incident_rollback.sql', '20260911130000_security_mfa_staged_enforcement.sql']) {
    await db.exec(await source(`../migrations/${name}`));
  }
  await check('search and commission RPCs unavailable to API clients', async () => {
    const names = ['search_clients_unaccent', 'search_leads_unaccent', 'search_invoices_unaccent', 'search_sales_unaccent', 'search_proposals_unaccent', 'search_credit_notes_unaccent', 'generate_sale_commission_splits'];
    const { rows } = await db.query("SELECT proname, has_function_privilege('authenticated',oid,'EXECUTE') AS member, has_function_privilege('anon',oid,'EXECUTE') AS anon, has_function_privilege('service_role',oid,'EXECUTE') AS service FROM pg_proc WHERE proname = ANY($1)", [names]);
    assert.equal(rows.length, 7);
    for (const row of rows) { assert.equal(row.member, false); assert.equal(row.anon, false); assert.equal(row.service, true); }
  });
  await asUser(userA);
  await check('admin of A remains viewer in B', async () => {
    assert.equal(await scalar(`SELECT public.is_org_admin('${userA}','${orgA}')`), true);
    assert.equal(await scalar(`SELECT public.is_org_admin('${userA}','${orgB}')`), false);
    await assert.rejects(db.exec(`INSERT INTO public.automation_flows VALUES(gen_random_uuid(),'${orgB}')`), /row-level security/);
  });
  await check('viewer cannot insert update or delete business records', async () => {
    await assert.rejects(db.exec(`INSERT INTO public.leads(id,organization_id) VALUES(gen_random_uuid(),'${orgB}')`), /row-level security/);
    assert.equal((await db.query(`UPDATE public.leads SET name='changed' WHERE organization_id='${orgB}' RETURNING id`)).rows.length, 0);
    assert.equal((await db.query(`DELETE FROM public.leads WHERE organization_id='${orgB}' RETURNING id`)).rows.length, 0);
  });
  await check('viewer cannot bypass parent permission through child records or import RPC', async () => {
    await assert.rejects(db.exec("INSERT INTO public.proposal_cpes VALUES(gen_random_uuid(),'30000000-0000-0000-0000-000000000002')"), /row-level security/);
    await assert.rejects(db.exec("SELECT public.delete_lead_import('30000000-0000-0000-0000-000000000003')"), /Permission denied/);
    assert.equal(await scalar("SELECT has_function_privilege('authenticated','public.security_delete_lead_import_internal(uuid)','EXECUTE')"), false);
  });
  await asUser(userA, 'aal1');
  await check('incident rollback restores AAL1 business data without cross-user policy probes', async () => {
    assert.equal(await scalar(`SELECT public.meets_mfa_policy('${userA}')`), true);
    assert.equal(await scalar(`SELECT public.meets_mfa_policy('${userB}')`), false);
    const visibleLeads = (await db.query('SELECT organization_id FROM public.leads')).rows;
    assert.ok(visibleLeads.length > 0);
  });
  await asUser(userB, 'aal1');
  await check('ordinary unenrolled user retains access and commission trigger works', async () => {
    assert.equal(await scalar(`SELECT public.meets_mfa_policy('${userB}')`), true);
    await db.exec(`INSERT INTO public.sales(id,organization_id,created_by) VALUES(gen_random_uuid(),'${orgB}','${userB}')`);
  });
  await check('own scope cannot change another owner record', async () => {
    assert.equal(await scalar(`SELECT public.can_write_owned_record('${orgB}','{"created_by":"${userA}"}')`), false);
    assert.equal(await scalar(`SELECT public.can_write_owned_record('${orgB}','{"created_by":"${userB}"}')`), true);
  });
  await db.exec('RESET ROLE');
  await check('definer trigger can still invoke private commission function', async () => assert.equal(await scalar('SELECT count(*)::int FROM public.commission_calls'), 1));
  await check('browser cannot enqueue service automation jobs', async () => {
    for (const action of ['INSERT', 'UPDATE', 'DELETE']) assert.equal(await scalar(`SELECT has_table_privilege('authenticated','public.automation_queue','${action}')`), false);
  });
  await db.exec(`INSERT INTO public.organization_profiles(id,organization_id,base_role,module_permissions,data_scope)
    VALUES('40000000-0000-0000-0000-000000000001','${orgB}','salesperson','{"leads":{"subareas":{"kanban":{"add":true,"edit":false}}}}','own');
    UPDATE public.organization_members SET profile_id='40000000-0000-0000-0000-000000000001' WHERE user_id='${userB}'`);
  await asUser(userB);
  await check('granular permission allows add but denies edit and unspecified delete', async () => {
    assert.equal(await scalar(`SELECT public.has_module_permission('${userB}','${orgB}','leads','kanban','add')`), true);
    assert.equal(await scalar(`SELECT public.has_module_permission('${userB}','${orgB}','leads','kanban','edit')`), false);
    assert.equal(await scalar(`SELECT public.has_module_permission('${userB}','${orgB}','leads','kanban','delete')`), false);
  });
  await db.exec('RESET ROLE');
  await db.exec(`INSERT INTO auth.mfa_factors VALUES('${userB}','verified')`);
  await asUser(userB, 'aal1');
  await check('incident rollback keeps an enrolled AAL1 user operational', async () => assert.equal(await scalar(`SELECT public.meets_mfa_policy('${userB}')`), true));
  await asUser(userB, 'aal2');
  await check('enrolled salesperson AAL2 is accepted', async () => assert.equal(await scalar(`SELECT public.meets_mfa_policy('${userB}')`), true));
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: userA, aal: 'aal1', role: 'authenticated' })]);
  await check('staged MFA enforcement starts only after the announced Lisbon deadline', async () => {
    assert.equal(await scalar(`SELECT public.mfa_policy_allows('${userA}','2026-09-20T23:59:59+01:00')`), true);
    assert.equal(await scalar(`SELECT public.mfa_policy_allows('${userA}','2026-09-21T00:00:00+01:00')`), false);
    assert.equal(await scalar("SELECT has_function_privilege('authenticated','public.mfa_policy_allows(uuid,timestamptz)','EXECUTE')"), false);
  });
  await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: userA, aal: 'aal2', role: 'authenticated' })]);
  await check('staged MFA enforcement accepts AAL2 after the deadline', async () => {
    assert.equal(await scalar(`SELECT public.mfa_policy_allows('${userA}','2026-09-21T00:00:00+01:00')`), true);
  });
  await db.exec('RESET ROLE');
  await db.exec(`UPDATE public.organization_members SET is_active=false WHERE user_id='${userB}'`);
  await asUser(userB);
  await check('inactive membership cannot fall back to profiles', async () => assert.equal(await scalar(`SELECT public.get_user_org_id('${userB}')`), null));
  await check('organization directory rejects removed membership', async () => assert.equal((await db.query(`SELECT * FROM public.search_organizations_by_name('${orgB}','Alpha',1000000)`)).rows.length, 0));
  await db.exec('RESET ROLE');
  await check('store policies unchanged', async () => assert.equal(await scalar("SELECT count(*)::int FROM pg_policies WHERE tablename='orders'"), 1));
  await check('global admin policy expressions eliminated', async () => assert.equal(await scalar("SELECT count(*)::int FROM pg_policies WHERE coalesce(qual,'') LIKE '%has_role(auth.uid(), ''admin''%'"), 0));
  await db.exec(await source('../../migration/sql/50-grants.sql'));
  await check('restore preserves column ACLs and private RPCs', async () => {
    assert.equal(await scalar("SELECT has_column_privilege('authenticated','public.organizations','secret','SELECT')"), false);
    assert.equal(await scalar("SELECT has_column_privilege('authenticated','public.organizations','name','SELECT')"), true);
    assert.equal(await scalar("SELECT has_function_privilege('authenticated','public.generate_sale_commission_splits(uuid)','EXECUTE')"), false);
  });
  console.log(`${checks} PostgreSQL fixture checks passed (not full Supabase integration).`);
} finally { await db.close(); }
