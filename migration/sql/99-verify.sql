-- STEP 9 — verification. Run on BOTH projects and compare the counts.
-- They should match (the NEW one may differ only if writes happened after the dump,
-- which is why you freeze writes during the migration window).

select 'auth.users'      as table, count(*) from auth.users
union all select 'auth.identities',     count(*) from auth.identities
union all select 'organizations',       count(*) from organizations
union all select 'organization_members',count(*) from organization_members
union all select 'profiles',            count(*) from profiles
union all select 'crm_clients',         count(*) from crm_clients
union all select 'leads',               count(*) from leads
union all select 'proposals',           count(*) from proposals
union all select 'sales',               count(*) from sales
union all select 'sale_payments',       count(*) from sale_payments
union all select 'invoices',            count(*) from invoices
union all select 'expenses',            count(*) from expenses
order by 1;

-- Spot-check a few logins survived (passwords are bcrypt hashes; if encrypted_password
-- is non-null the user can log in with their existing password):
select email, (encrypted_password is not null) as has_password, email_confirmed_at is not null as confirmed
from auth.users
order by created_at
limit 10;
