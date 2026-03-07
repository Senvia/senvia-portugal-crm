

## Fix: send-access-email Brevo fallback

### Problem
The edge function `send-access-email` returns 400 when the organization doesn't have `brevo_api_key` or `brevo_sender_email` configured. Unlike other email functions (e.g. `send-proposal-email`), it has no fallback to the global `BREVO_API_KEY` secret.

### Solution
Update `supabase/functions/send-access-email/index.ts` to mirror the pattern used in `send-proposal-email`:

1. If `org.brevo_api_key` is empty, fall back to `Deno.env.get("BREVO_API_KEY")`
2. If `org.brevo_sender_email` is empty, fall back to `"noreply@senvia.pt"`
3. Only throw error if neither org-level nor global key exists

### Changes

**File: `supabase/functions/send-access-email/index.ts`**
- Replace the hard block (`if (!brevoApiKey || !senderEmail)`) with fallback logic:
  - `const brevoApiKey = org.brevo_api_key || Deno.env.get("BREVO_API_KEY")`
  - `const senderEmail = org.brevo_sender_email || "noreply@senvia.pt"`
  - Only error if `brevoApiKey` is still null after fallback
- Also update CORS headers to include the full set of required Supabase client headers

