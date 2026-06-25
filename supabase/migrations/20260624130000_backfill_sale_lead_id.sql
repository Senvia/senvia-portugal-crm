-- Make sale.lead_id survive the lead -> client -> proposal -> sale chain, so the
-- Meta CAPI Purchase trigger (trg_meta_capi_purchase, AFTER INSERT on sales) can
-- actually fire.
--
-- Problem: the Purchase trigger needs sale.lead_id, but in practice it was almost
-- always NULL. Sales are created from a client or a proposal, and the lead link
-- was dropped along the way (only 6 of 145 sales carried lead_id, all seed data).
-- So the conversion event never reached Meta.
--
-- Fix: a client created from a lead carries crm_clients.lead_id. Backfill the
-- sale's lead_id from its client when missing, BEFORE INSERT so the value
-- persists on the row and the existing AFTER INSERT Purchase trigger then fires.
-- (BEFORE triggers always run before AFTER triggers, so ordering is guaranteed.)

CREATE OR REPLACE FUNCTION public.backfill_sale_lead_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lead_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT c.lead_id INTO NEW.lead_id
    FROM public.crm_clients c
    WHERE c.id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backfill_sale_lead_id ON public.sales;
CREATE TRIGGER trg_backfill_sale_lead_id
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.backfill_sale_lead_id();
