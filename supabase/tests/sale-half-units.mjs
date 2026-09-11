import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();

await db.exec(`
  CREATE SCHEMA IF NOT EXISTS public;

  CREATE TABLE public.organizations (
    id uuid PRIMARY KEY,
    name text,
    created_at timestamptz DEFAULT now(),
    trial_reminders_sent jsonb DEFAULT '{}',
    last_active_at timestamptz,
    servicos_products_config jsonb
  );

  CREATE TABLE public.leads (id uuid PRIMARY KEY, organization_id uuid NOT NULL);
  CREATE TABLE public.proposals (id uuid PRIMARY KEY, organization_id uuid NOT NULL);
  CREATE TABLE public.org_onboarding_state (
    organization_id uuid PRIMARY KEY,
    stages_completed text[] DEFAULT '{}'
  );

  CREATE TABLE public.crm_clients (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    total_sales integer DEFAULT 0,
    total_value numeric DEFAULT 0,
    total_comissao numeric DEFAULT 0,
    total_mwh numeric DEFAULT 0,
    total_kwp numeric DEFAULT 0,
    total_cartoes numeric DEFAULT 0,
    updated_at timestamptz DEFAULT now()
  );

  CREATE TABLE public.sales (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL,
    client_id uuid,
    servicos_details jsonb,
    total_value numeric DEFAULT 0,
    comissao numeric,
    consumo_anual numeric,
    kwp numeric,
    total_cartoes numeric NOT NULL DEFAULT 0
  );

  CREATE TABLE public.proposal_products (
    id uuid PRIMARY KEY,
    quantity integer NOT NULL DEFAULT 1
  );

  CREATE TABLE public.sale_items (
    id uuid PRIMARY KEY,
    sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    quantity integer NOT NULL DEFAULT 1
  );

  CREATE OR REPLACE FUNCTION public._safe_numeric(value text)
  RETURNS numeric
  LANGUAGE sql
  IMMUTABLE
  AS $$ SELECT NULLIF(value, '')::numeric $$;
`);

const migration = await readFile(
  new URL('../migrations/20260911133000_sale_half_units.sql', import.meta.url),
  'utf8',
);
await db.exec(migration);

await db.exec(`
  CREATE TRIGGER client_sales_metrics_test_trg
    AFTER INSERT OR UPDATE OR DELETE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.update_client_sales_metrics();

  CREATE TRIGGER sales_total_cartoes_trg
    BEFORE INSERT OR UPDATE OF servicos_details ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.compute_sale_total_cartoes();

  INSERT INTO public.organizations (id, name, servicos_products_config)
  VALUES (
    '10000000-0000-0000-0000-000000000001',
    'Half-unit test',
    '[{"name":"Internet","included_cards":1,"tiered_commission":true,"quantity_tiers":[{"min":1,"max":null,"included_cards":1}]}]'
  );

  INSERT INTO public.crm_clients (id, organization_id)
  VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');

  INSERT INTO public.sales (id, organization_id, client_id, servicos_details)
  VALUES (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '{"Internet":{"quantidade":0.5}}'
  );

  INSERT INTO public.sales (id, organization_id, client_id)
  VALUES (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001'
  );

  INSERT INTO public.sale_items (id, sale_id, quantity)
  VALUES (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    0.5
  );

  INSERT INTO public.sales (id, organization_id, client_id, servicos_details)
  VALUES (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '{"Internet":{"quantidade":2}}'
  );

  INSERT INTO public.proposal_products (id, quantity)
  VALUES ('50000000-0000-0000-0000-000000000001', 0.5);
`);

const saleRows = await db.query(`
  SELECT id, operational_units, total_cartoes
  FROM public.sales
  ORDER BY id
`);
assert.deepEqual(saleRows.rows.map((row) => ({
  ...row,
  operational_units: Number(row.operational_units),
  total_cartoes: Number(row.total_cartoes),
})), [
  {
    id: '30000000-0000-0000-0000-000000000001',
    operational_units: 0.5,
    total_cartoes: 0.5,
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    operational_units: 0.5,
    total_cartoes: 0,
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    operational_units: 2,
    total_cartoes: 2,
  },
]);

const clientRows = await db.query(`
  SELECT total_sales
  FROM public.crm_clients
  WHERE id = '20000000-0000-0000-0000-000000000001'
`);
assert.equal(Number(clientRows.rows[0]?.total_sales), 3);

const itemRows = await db.query(`SELECT quantity FROM public.sale_items`);
assert.equal(Number(itemRows.rows[0]?.quantity), 0.5);

const proposalRows = await db.query(`SELECT quantity FROM public.proposal_products`);
assert.equal(Number(proposalRows.rows[0]?.quantity), 0.5);

const activationRows = await db.query(`SELECT total_sales FROM public.trial_activation_counts`);
assert.equal(Number(activationRows.rows[0]?.total_sales), 3);

console.log('Half-unit database checks passed.');
await db.close();
