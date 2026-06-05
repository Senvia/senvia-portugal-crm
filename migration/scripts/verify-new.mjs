// Verifies the NEW project actually has data. Uses the service_role key (bypasses RLS).
// Run via: NEW_URL=... SK=<service_role> node migration/scripts/verify-new.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEW_URL, key = process.env.SK;
if (!url || !key) { console.error('missing NEW_URL/SK'); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const tables = [
  'organizations','organization_members','profiles','crm_clients','leads',
  'pipeline_stages','proposals','sales','sale_items','sale_payments','invoices',
  'credit_notes','expenses','expense_categories','email_templates','campaigns',
  'automation_queue','app_announcements','stripe_commission_records',
];

console.log('== Row counts (NEW project) ==');
for (const t of tables) {
  const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
  console.log((t + ':').padEnd(26), error ? ('ERR ' + error.message) : count);
}

console.log('\n== Auth users ==');
let total = 0, page = 1;
for (;;) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.log('auth ERR', error.message); break; }
  total += data.users.length;
  if (data.users.length < 1000 || page > 20) break;
  page++;
}
console.log('auth.users total:', total);

console.log('\n== Spot checks (devem refletir os dados antigos) ==');
const { data: org } = await sb.from('organizations')
  .select('name,plan,billing_exempt,first_paid_at').ilike('name', '%escolha%');
console.log('Escolha Inteligente:', JSON.stringify(org));
const { data: sale } = await sb.from('sales')
  .select('code,recurring_value,total_value,recurring_status').eq('code', '0007');
console.log('Venda 0007 (Joao Basilio, esperado recurring_value=75):', JSON.stringify(sale));
