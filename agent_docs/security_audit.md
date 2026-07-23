## Security Audit — Senvia OS CRM

Date: 2026-07-21  
Scope: Full codebase (src/, supabase/, functions/)  
Auditor: Sisyphus

---

## Verdict: BLOCK

4 critical/medium findings that require remediation before production deployment.

---

## Findings

### 🔴 CRITICAL — WhatsApp & InvoiceXpress API keys exposed to browser

**File:** `src/contexts/AuthContext.tsx:30-34`

The `Organization` interface used in the Auth context includes:

```typescript
invoicexpress_api_key?: string | null;    // linha 31
whatsapp_api_key?: string | null;         // linha 33
```

**Root Cause Analysis:**

1. The `AuthContext` loads the full organization row via `.select('*')` or via an explicit query that includes these fields.
2. These API keys (`invoicexpress_api_key`, `whatsapp_api_key`) are stored in the `organizations` SQL table.
3. The RLS policy "Users view own organization" allows authenticated users to read their org's row.
4. The keys are then available in the browser JS context, accessible to:
   - Any XSS vulnerability (even minor)
   - Browser extensions
   - Any JS loaded by third-party scripts (analytics, widgets, etc.)
   - Anyone with DevTools access

**Impact:** 
- `whatsapp_api_key` — Full access to the org's WhatsApp Evolution API. Can send messages, read messages, manage contacts.
- `invoicexpress_api_key` — Full access to the org's InvoiceXpress account. Can generate/delete invoices, credit notes, receipts.

**Fix:** 
1. Create a separate `organizations_public` view that only exposes non-sensitive columns to the frontend.
2. Or create a Supabase RPC function `get_org_public_data()` that returns only safe fields (name, slug, plan, logo, etc.)
3. Edge functions that need the keys can read them server-side via admin client.

---

### 🔴 CRITICAL — Edge functions use service_role key (full admin access)

**Files:** `supabase/functions/chatwoot-inbox/index.ts:292`, ALL edge functions in supabase/functions/

Every edge function creates a Supabase admin client with the service role key:

```typescript
const admin = createClient(cfg.supabaseUrl, cfg.serviceKey);
```

**Risk:** If ANY edge function has a vulnerability (SSRF, injection, auth bypass), the attacker gains **full database admin access** — all tables, all orgs, all secrets.

**Current vulnerabilities that could trigger this:**
- SSRF in chatwoot-inbox (partially fixed) 🔴
- No input validation on any edge function body 🟡
- No rate limiting (DoS could mask exploit attempts) 🟡

**Mitigation:** 
- Add column-level SELECT permissions on the service client where possible
- Validate ALL input shapes with Zod before processing
- Add a middleware that validates org_id is a valid UUID before using it

---

### 🔴 HIGH — SSRF bypass via `download_attachment` (FIXED)

**File:** `supabase/functions/chatwoot-inbox/index.ts:1098-1111`

**Status:** ✅ FIXED — Changed `startsWith` to `new URL().origin` check

---

### 🟡 MEDIUM — No input validation on edge function bodies

**Files:** ALL edge functions that parse `req.json()`

**Example (chatwoot-inbox):**
```typescript
const body = await req.json().catch(() => ({}));
const { organization_id, action, conversation_id, content, contact_phone } = body;
```

**Risk:** No schema validation on any action payload. Malformed/oversized/crafted payloads can cause unexpected behavior or resource exhaustion.

---

### 🟡 MEDIUM — No rate limiting on public webhooks

**Files:** stripe-webhook, brevo-webhook, chatwoot-webhook

---

### 🟢 LOW — 58 `select('*')` in frontend

---

### ✅ GOOD (no action needed)

| Area | Status |
|------|--------|
| RLS on all tables | ✅ Every CREATE TABLE has ENABLE ROW LEVEL SECURITY |
| Stripe webhook signature | ✅ `constructEventAsync()` verifies signature |
| Brevo webhook secret | ✅ `?key=` or `x-webhook-secret` header check |
| Chatwoot webhook auth | ✅ Per-org webhook secret validated |
| Hardcoded secrets in source | ✅ None found |
| `dangerouslySetInnerHTML` | ✅ Not used anywhere |
| Anon key exposure | ✅ Only in .env (gitignored) |

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 CRITICAL | 2 | Unfixed |
| 🔴 HIGH | 1 | ✅ Fixed |
| 🟡 MEDIUM | 2 | Unfixed |
| 🟢 LOW | 1 | Unfixed |

## Fix in progress

| Finding | Status |
|---------|--------|
| 🔴 SSRF | ✅ Commitado + deployado |
| 🔴 WhatsApp/InvoiceXpress keys exposed | ⏳ Pendente |
| 🟡 Input validation | ⏳ Pendente |
| 🟡 Rate limiting | ⏳ Pendente |
| 🟡 58 select('*') | ⏳ Refactor grande |