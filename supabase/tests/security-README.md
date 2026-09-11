# Database security regression suite

Run `node supabase/tests/security-database.mjs` from the project root. It runs the new migrations in PGlite (PostgreSQL WASM), switches API roles, and checks real function privileges and RLS decisions with fictional tenants. No remote connection is made. `--baseline` deliberately fails the first RPC privilege assertion against the insecure fixture to demonstrate the regression.

The fixture provides a reduced schema and auth JWT helper functions. Passing it does not establish that the complete historical Supabase schema migrates, that remote ACLs match, or that real Auth tokens enforce MFA. A full local/staging restore must run the migrations and repeat the API scenarios before deployment.

## Deployment sequence

1. Restore/apply all existing migrations through the current schema on an isolated copy, retaining object and column ACLs.
2. Apply `20260911100000_security_authorization.sql` (MFA helper, scoped admin/mailbox helpers, no profile organization fallback, private RPC grants).
3. Apply `20260911101000_security_business_policies.sql` (module write authorization and restrictive MFA policies; rewrite effective global admin policy checks to organization checks).
4. Apply `20260911102000_security_privileged_mutations.sql` (metadata RPC/seller authorization, email command author and tenant binding, private queue writes, MFA on administrative mutations).
5. Apply `20260911103000_security_import_rpc.sql` (permission wrappers around import preview/delete; original routines made private).
6. Apply `20260911104000_security_record_scope.sql` (own/team/all scope on lead, client, proposal and sale changes).
7. Apply `20260911123000_security_mfa_incident_rollback.sql`, then `20260911130000_security_mfa_staged_enforcement.sql`. AAL1 remains accepted through 20 September 2026 in Lisbon; AAL2 is required from 21 September 2026 at 00:00 Lisbon time.
8. Apply `20260911131500_finance_recurring_cycle_compatibility.sql` so legacy recurring sales honor their stored current-cycle date before returning to the configured anchor.
9. Apply other security migrations provided by the jobs worker, then deploy matching authenticated Edge Functions/frontend before the MFA deadline. Verify enrollment and recovery with test users.
10. For a project restore, run `migration/sql/50-grants.sql` after security migrations. It preserves dumped client ACLs, grants service privileges, and fails if secret-column/private-RPC ACLs are unsafe. Do not substitute blanket browser grants.

## Acceptance on a full isolated Supabase schema

- Tenant A administrator / tenant B viewer: no B administrative policies, no B writes, no private mailbox access.
- Viewer and explicitly denied granular profile: direct REST INSERT/UPDATE/DELETE denied; authorized salesperson retains allowed actions and record scope.
- Nested proposal records cannot bypass parent module permissions.
- Before the deadline, AAL1 users retain authorized CRM access while unenrolled users receive the daily adoption reminder. From 21 September 2026 at 00:00 Lisbon time, AAL1 users cannot access protected business data or privileged RPCs; AAL2 restores authorized access. Bootstrap reads and MFA enrollment remain available.
- Removing/deactivating the final membership leaves `get_user_org_id` NULL even with stale `profiles.organization_id` or JWT active organization.
- Anonymous/authenticated callers cannot execute six internal search RPCs, commission generation or internal import routines. Legitimate commission triggers still execute.
- Email commands require the authenticated author and channel organization; ordinary users cannot write automation_queue.
- Restore keeps organizations secret columns and messaging_channels raw metadata unreadable to browser roles.
- Store/e-commerce policies remain unchanged, as requested. Shared CRM helpers receive the security corrections; no store authentication change was implemented.

Rollback must preserve restrictive privileges: prefer a forward correction. Do not restore the removed broad grants or SECURITY DEFINER exposure to regain functionality. Pause affected traffic if the full-schema acceptance checks fail.
