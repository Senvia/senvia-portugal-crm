# Security Review — Cactus Branch
**Date:** 2026-07-02
**Reviewer:** Cactus (AI assistant)
**Scope:** All changes on Cactus branch vs main

## Summary

**Verdict: ✅ Pass** — No security issues found.

## Findings

### 1. Hardcoded Secrets ❌ Not Found
- Otto 2.0 function: No hardcoded tokens, API keys, or passwords
- All secrets sourced from `Deno.env.get()` or runtime auth headers
- Frontend: No secrets exposed in build output

### 2. Authentication & Authorization ✅ Proper
- `context.ts`: Validates JWT token via `supabase.auth.getUser()`
- Skips anon-key calls (treats as unauthenticated)
- Tools check `adminOnly` flag; write operations require admin or specific permissions
- Service role bypass is expected for internal cron/webhook functions

### 3. SQL Injection ✅ Mitigated
- `stamp_org_activity()` uses `TG_ARGV[0]` (developer-controlled, not user input)
- Onboarding tools use parameterized queries via Supabase client
- No raw `EXECUTE` with user input found

### 4. Cross-Tenant Data Access ✅ Gated
- Security hardening migration (`20260619120000`) applied:
  - Storage: scoped to org members via `is_org_member()`
  - `stripe_commission_records`: INSERT scoped to own org
  - `prospect_generation_jobs`: UPDATE scoped to own org
- `trial_activation_counts` view: `security_invoker = true` applies org RLS
- All database queries use `organization_id` filter

### 5. Audit Logging ✅ Present
- `supabase/functions/otto/lib/audit.ts` — best-effort logging for all write actions
- Writes to `otto_action_log` table with org_id, user_id, tool_name, args, timestamp

### 6. Input Validation ✅ Present
- Onboarding tools validate argument types and required fields
- `configure_invoicing` validates provider enum values
- `setup_pipeline_stages` validates array length >= 2
- `set_company_info` validates non-empty strings

### 7. CVEs / Dependencies ⚠️ Note
- No known CVEs in the dependency scan
- Build produces chunk size warnings (not a security concern)

## Recommendations (None Critical)
- Consider adding input size limits for string parameters in Otto tools
- Consider adding rate limiting to Otto function calls

## Verified By
- [x] No hardcoded secrets
- [x] Auth validation present
- [x] SQL injection vectors reviewed
- [x] RLS/tenant isolation verified
- [x] Audit logging in place
- [x] Input validation checked
