# SENVIA OS — Cactus Branch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy all pending SENVIA OS features, migrations, and Otto 2.0 on the Cactus branch with security and bug verification after each task.

**Architecture:** Monorepo with Vite+React frontend + Supabase (PostgreSQL + Edge Functions). All changes on `Cactus` branch, no merge to `main` until verified.

**Tech Stack:** React 18, TypeScript, Vite (SWC), Supabase CLI (migrations + functions), Claude Code for execution

**Supabase Reference:** `chhmfwlimtbsyjmgtokn`

**Branch:** `Cactus` (already exists, 1 commit ahead of main with `trial_activation_counts`)

---

## Global Constraints

- ALL changes go ONLY to the `Cactus` branch. No merge to `main`.
- Each task must be verified: (1) functionality check, (2) security review, (3) bug check
- Only mark task complete after Claude confirms all 3 verification criteria pass
- Escalate to Thiago if any step fails or seems risky
- Never modify database without explicit approval for production impact
- Use `git add` and `git commit` after each completed+verified task

---

### Task 1: Deploy Pending Supabase Migrations

**Files:**
- Modify: (none — migrations are run via Supabase CLI)
- Run: `supabase db push` from `/tmp/senvia-crm`

**Context:**
The migrations directory has ~282 migration files. The last known deployed migration was `20260618200000_meta_capi_purchase.sql` (June 18). There are approximately 34 NEW migrations that need deploying, ranging from June 18 through July 2, 2026.

Key migrations to deploy include:
- `20260619120000_security_hardening.sql` — RLS hardening, search_path pinning
- `20260620120000_otto_onboarding_and_audit.sql` — Otto 2.0 tables
- `20260622120000_org_activity_signal.sql` — activation signals infrastructure
- `20260622121000_trial_email_sequence_seed.sql` — trial email templates
- `20260622122000_trial_activation_overview.sql` — activation dashboard view
- `20260622123000_onboarding_module_dismissed.sql` — module dismissal
- `20260622130000_trial_whatsapp_nudges.sql` + config + cron
- `2026062412*-2026062415*` — admin fixes, backfills, funnel views
- `20260629180000_trial_whatsapp_cron.sql` — pg_cron scheduling
- `20260630120000_unarchive_lead_on_whatsapp_nudge.sql`
- `20260630130000_inbox_messages.sql`
- `20260702120000_trial_activation_counts.sql` (already on Cactus branch)

**Approach:** Run `supabase db push --linked` to deploy all pending migrations. Supabase CLI handles ordering and deduplication.

**Checklist:**

- [ ] **Step 1: Verify Supabase CLI is linked**

Run: `cd /tmp/senvia-crm && supabase link --project-ref chhmfwlimtbsyjmgtokn`
Expected: Project linked successfully

- [ ] **Step 2: Run dry-run first to see what would be deployed**

Run: `cd /tmp/senvia-crm && supabase db push --dry-run`
Expected: Lists pending migrations without applying them

- [ ] **Step 3: Deploy pending migrations**

Run: `cd /tmp/senvia-crm && supabase db push --linked`
Expected: All pending migrations applied successfully

- [ ] **Step 4: Verify migrations succeeded**

Run: Connect to Supabase SQL editor or query `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version` to confirm all 34 new migrations appear
Expected: All migration versions present in the table

- [ ] **Step 5: Security check for Task 1**

Review the security_hardening migration (`20260619120000_security_hardening.sql`):
- Verify RLS policies are properly scoped (org-based, not wide-open)
- Verify SECURITY DEFINER functions have `search_path = public` set
- Check for any potential cross-tenant data exposure

- [ ] **Step 6: Bug check for Task 1**

- Verify no migration failed (check Supabase logs)
- Verify the activation signal triggers compile correctly
- Verify the trial email seed didn't error
- Check pg_cron extension is available for the WhatsApp nudge scheduling

- [ ] **Step 7: Commit migration verification**

```bash
cd /tmp/senvia-crm
git add supabase/migrations/20260619120000_security_hardening.sql
git commit -m "chore: document deployed migrations up to 2026-07-02"
```

---

### Task 2: Deploy Otto 2.0 Edge Function

**Files:**
- Deploy: `supabase/functions/otto/` (entire directory)

**Context:**
Otto 2.0 is a complete rewrite of the legacy `otto-chat` function. It lives in `supabase/functions/otto/` and has:
- `index.ts` — main entry, tool-calling loop with SSE streaming
- `lib/cors.ts` — CORS + streaming helpers
- `lib/context.ts` — auth, org, onboarding, permissions context loader
- `lib/prompts.ts` — system prompt builder
- `lib/ai.ts` — AI gateway client (resilient chat completion)
- `lib/types.ts` — type definitions
- `lib/onboarding.ts` — onboarding state machine
- `lib/tools/registry.ts` — tool registry
- `lib/tools/onboarding-tools.ts` — onboarding-specific tools
- `lib/tools/support-tools.ts` — support-mode tools

The function requires these env vars:
- `OTTO_AI_PROVIDER` (defaults to gemini)
- `OTTO_AI_MODEL` (defaults to gemini-2.5-flash)
- `OTTO_AI_KEY` (API key for the AI provider)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (set automatically by Supabase)

**Approach:** Deploy using `supabase functions deploy otto` with the needed env vars.

- [ ] **Step 1: Inspect env requirements for Otto 2.0**

Read: `supabase/functions/otto/lib/ai.ts` to verify what env vars are expected
Expected: Env vars documented in the file

- [ ] **Step 2: Deploy Otto 2.0 function**

Run: `cd /tmp/senvia-crm && supabase functions deploy otto --no-verify-jwt`
Expected: Function deployed successfully

- [ ] **Step 3: Set environment variables for Otto 2.0**

Run: `cd /tmp/senvia-crm && supabase secrets set OTTO_AI_PROVIDER=gemini OTTO_AI_MODEL=gemini-2.5-flash`
(The OTTO_AI_KEY should already exist from previous setup)

- [ ] **Step 4: Verify function deployment**

Run: `curl -X OPTIONS https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/otto` or check Supabase dashboard
Expected: CORS response (no auth error)

- [ ] **Step 5: Security check for Task 2**

- Verify `otto/index.ts` has no hardcoded secrets
- Verify auth is properly validated in `context.ts`
- Verify tool permissions are scope-checked (admin-only vs user-level)
- Check for SQL injection potential in onboarding tools (dynamic column updates)
- Verify audit logging captures write actions
- Check that the AI provider key is not exposed in responses

- [ ] **Step 6: Bug check for Task 2**

- Verify the function loads without import errors (check Supabase logs)
- Verify SSE streaming code handles connection drops
- Check rate limiting edge cases
- Verify the 5-iteration max prevents infinite loops

- [ ] **Step 7: Commit deployment verification**

```bash
cd /tmp/senvia-crm
git add supabase/functions/otto/
git commit -m "feat: deploy Otto 2.0 edge function"
```

---

### Task 3: Frontend Cutover Verification — Build Test

**Files:**
- Verify: `src/hooks/useOttoChat.ts` (already points to `/functions/v1/otto`)
- Verify: `src/hooks/useActivationProgress.ts` (module peek logic)
- Verify: `src/hooks/useOttoOnboarding.ts` (dashboard setup card)

**Context:**
The frontend already has all the Otto 2.0 integration code:
- `useOttoChat.ts` points to `{SUPABASE_URL}/functions/v1/otto` (not `otto-chat`)
- `ModuleOnboardingPeek.tsx` shows per-module Otto bubbles (leads, clients, sales, etc.)
- `OttoOnboardingProgress.tsx` shows progress in the chat panel
- `OttoDashboardSetup.tsx` shows setup card on dashboard
- `useActivationProgress.ts` checks real activation signals (first_*_at columns)

**No code changes are expected** — this task is to verify everything compiles and the door is ready for the cutover.

- [ ] **Step 1: Install dependencies**

Run: `cd /tmp/senvia-crm && npm ci`
Expected: Dependencies installed without errors

- [ ] **Step 2: Build the frontend**

Run: `cd /tmp/senvia-crm && npm run build`
Expected: Build succeeds, no TypeScript errors

- [ ] **Step 3: Check for TypeScript errors related to Otto/functions**

Run: `cd /tmp/senvia-crm && npx tsc --noEmit 2>&1 | grep -i "otto\|onboarding\|activation\|function" || echo "No Otto-related TS errors"`

- [ ] **Step 4: Security check for Task 3**

- Verify no API keys/tokens are exposed in the build
- Verify auth tokens are properly fetched from session (not hardcoded)
- Check that the `OTTO_URL` uses `import.meta.env.VITE_SUPABASE_URL` (env, not hardcoded)
- Verify error messages don't leak internal state

- [ ] **Step 5: Bug check for Task 3**

- Verify the zustand store persists messages correctly (sessionStorage)
- Verify abort controller handles cancellation
- Check attachment upload error handling
- Verify mobile vs desktop layout differences

- [ ] **Step 6: Commit build verification**

```bash
cd /tmp/senvia-crm
git add src/
git commit -m "chore: verify frontend compiles with Otto 2.0 integration"
```

---

### Task 4: Activate Trial Email Sequence & Verify Triggers

**Files:**
- Verify: `supabase/migrations/20260622121000_trial_email_sequence_seed.sql`
- Verify: `supabase/functions/cleanup-expired-trials/index.ts` (trial end logic)

**Context:**
The trial email sequence was seeded in migration `20260622121000_trial_email_sequence_seed.sql`. It created 5 email templates:
1. Trial Ativado (day 1)
2. Trial · Dia 3 — Ativação
3. Trial · Dia 7 — Diferenciadores
4. Trial · Dia 11 — Decisão
5. Último dia trial (day 13)

The challenge is that the automation trigger (who sends these emails) needs to be verified. The `cleanup-expired-trials` function may need to be updated, or there may be a new processing function needed.

- [ ] **Step 1: Check the trial email templates were seeded**

Run a Supabase query to verify templates exist in `email_templates` table
Expected: 5 trial email templates present

- [ ] **Step 2: Verify email trigger mechanism**

Check `supabase/functions/process-automation/index.ts` or `supabase/functions/check-trial-status/index.ts` for trial email sending logic
Expected: The trigger mechanism exists or needs to be determined

- [ ] **Step 3: Check the trial inactivity check function**

Verify `supabase/functions/trial-inactivity-check/index.ts` sends the inactivity email correctly

- [ ] **Step 4: Security check for Task 4**

- Verify email templates don't contain malicious content
- Check that personal data isn't leaked in email addresses
- Verify the inactivity check doesn't spam users (cooldown check)

- [ ] **Step 5: Bug check for Task 4**

- Verify email sequence cron/schedule is configured
- Check template rendering doesn't throw errors for missing variables
- Verify tracking (opens/clicks) is working

- [ ] **Step 6: Commit**

```bash
cd /tmp/senvia-crm
git commit -m "chore: verify trial email sequence active"
```

---

### Task 5: Full Security Review of Cactus Branch Changes

**Files:**
- ALL files on Cactus branch vs main

**Checklist:**

- [ ] **Step 1: List all files changed on Cactus branch**

Run: `cd /tmp/senvia-crm && git diff --name-only main..Cactus`
Expected: List of all changed files

- [ ] **Step 2: Review each changed file for security issues**

Check for:
- Hardcoded tokens/keys/secrets
- SQL injection vectors (especially in Otto tools with `exec_format`)
- RLS bypass potential
- Cross-tenant data access
- Unauthenticated endpoints
- Missing input validation
- Insecure defaults

- [ ] **Step 3: Check Supabase RLS policies**

- Verify the security_hardening migration was applied
- Check that new tables/views have proper RLS
- Verify storage bucket policies are restrictive

- [ ] **Step 4: Document security findings**

Create `docs/superpowers/security-review-cactus.md` with findings

```bash
cd /tmp/senvia-crm && mkdir -p docs/superpowers
```

- [ ] **Step 5: Commit security review**

```bash
cd /tmp/senvia-crm
git add docs/superpowers/security-review-cactus.md
git commit -m "chore: add security review for Cactus branch"
```

---

### Task 6: Push Cactus Branch to GitHub

**Files:**
- Push: whole Cactus branch

- [ ] **Step 1: Push Cactus branch to origin**

```bash
cd /tmp/senvia-crm
git push origin Cactus
```

Expected: Branch pushed successfully to GitHub

- [ ] **Step 2: Verify remote matches local**

```bash
cd /tmp/senvia-crm
git ls-remote origin Cactus
git rev-parse Cactus
```
Expected: Both refs match

---

## Verification Summary

After all tasks complete:
1. ✅ All 34+ migrations deployed to Supabase
2. ✅ Otto 2.0 function deployed and accessible
3. ✅ Frontend builds with Otto 2.0 integration
4. ✅ Trial email sequence verified
5. ✅ Security review documented
6. ✅ Cactus branch pushed to GitHub
7. ✅ Each task verified: functionality + security + bugs
