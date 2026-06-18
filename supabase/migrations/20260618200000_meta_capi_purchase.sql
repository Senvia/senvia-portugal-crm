-- Meta CAPI: send a server-side Purchase (conversion) event when a sale is
-- created from a lead, so Meta can attribute the sale back to the ad click and
-- optimise campaigns for real buyers (not just form-fillers).
--
-- The Lead event already fires on lead capture (submit-lead). This closes the
-- loop: lead enters via the campaign, and Meta only hears "bought" once the lead
-- actually converts into a sale.

-- 1) Per-org Conversions API access token (multi-tenant). Stored as a column on
--    organizations like the other per-org secrets (whatsapp_api_key, brevo_api_key,
--    invoicexpress_api_key), protected by the existing org-member RLS. Edge
--    functions read it via the service role; the global token stays as a fallback.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS meta_conversions_api_token text;

-- 2) Idempotency guard: a Purchase event is sent at most once per sale.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS meta_capi_purchase_sent_at timestamptz;

-- 3) On a sale that came from a lead and carries a value, dispatch the Purchase
--    event. Fire-and-forget via pg_net so it can never block (or fail) the sale
--    insert. The edge function does the real work (loads lead identifiers, pixels
--    and the org token) with the service role.
CREATE OR REPLACE FUNCTION public.dispatch_meta_capi_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lead_id IS NULL OR COALESCE(NEW.total_value, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/meta-capi-purchase',
    body := jsonb_build_object('sale_id', NEW.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaG1md2xpbXRic3lqbWd0b2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjIwNTUsImV4cCI6MjA5NjIzODA1NX0.vLxYjpcZHzZhjbNkgy9tPnfK_L_jbSfoEueETgGqBgc'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Attribution must never break a sale. Log and move on.
  RAISE WARNING 'meta-capi-purchase dispatch failed for sale %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meta_capi_purchase ON public.sales;
CREATE TRIGGER trg_meta_capi_purchase
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_meta_capi_purchase();
