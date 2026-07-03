-- Motivational push when a sale is CONCLUDED ("Concluída" = status 'delivered').
-- Fires exactly once, on the transition INTO 'delivered' (regardless of which UI
-- path made the change), and sends a celebratory push — via the existing
-- send-push-notification function — to the SALES TEAM (salesperson) + ADMINS of
-- that sale's organization (not viewers).
--
-- Fire-and-forget via pg_net so it can never block or fail the sale update. Mirrors
-- the dispatch_meta_capi_purchase pattern.

CREATE OR REPLACE FUNCTION public.notify_sale_concluded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_body text;
  v_title text;
  v_user_ids uuid[];
  -- A motivational headline is picked at random per sale so the alert stays fresh.
  v_titles text[] := ARRAY[
    '🔥 Bateu mais uma! 💰',
    '🚀 Mais uma venda fechada! Bora pra próxima!',
    '🎉 Fechou! Rumo à meta! 🎯',
    '💪 É disso que a gente gosta!',
    '🏆 Mais um cliente conquistado!',
    '⚡ Contrato assinado! Vamos pra cima!',
    '🤑 Dinheiro entrando! Mais uma!',
    '💥 BOOM! Mais uma no placar!',
    '🌟 Time imparável! Mais uma venda!',
    '🔥 Tá voando! Mais uma fechada!'
  ];
BEGIN
  -- Only when the status transitions INTO 'delivered' from something else
  -- (including NULL). Skip if it wasn't set to delivered, or was already delivered.
  IF (NEW.status IS DISTINCT FROM 'delivered')
     OR (OLD.status IS NOT DISTINCT FROM 'delivered') THEN
    RETURN NEW;
  END IF;

  -- Recipients: only the SALES TEAM (salesperson) + ADMINS of this sale's org.
  SELECT array_agg(DISTINCT ur.user_id)
    INTO v_user_ids
  FROM public.user_roles ur
  JOIN public.organization_members om ON om.user_id = ur.user_id
  WHERE om.organization_id = NEW.organization_id
    AND om.is_active = true
    AND ur.role IN ('admin', 'super_admin', 'salesperson');

  -- No eligible recipient → send to nobody (never fall back to broadcasting to all,
  -- which is what send-push-notification does when user_ids is empty/absent).
  IF v_user_ids IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve a friendly name (client, else lead, else generic).
  SELECT COALESCE(c.name, c.company, l.name, 'Cliente')
    INTO v_client_name
  FROM (SELECT NEW.client_id AS cid, NEW.lead_id AS lid) s
  LEFT JOIN public.crm_clients c ON c.id = s.cid
  LEFT JOIN public.leads l ON l.id = s.lid;

  v_title := v_titles[1 + floor(random() * array_length(v_titles, 1))::int];
  v_body := COALESCE(v_client_name, 'Cliente')
            || ' — ' || COALESCE(NEW.total_value, 0)::numeric(12,2)::text || ' €';

  PERFORM net.http_post(
    url := 'https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'user_ids', to_jsonb(v_user_ids),
      'title', v_title,
      'body', v_body,
      'url', '/sales',
      'tag', 'sale-closed-' || NEW.id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoaG1md2xpbXRic3lqbWd0b2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjIwNTUsImV4cCI6MjA5NjIzODA1NX0.vLxYjpcZHzZhjbNkgy9tPnfK_L_jbSfoEueETgGqBgc'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A notification must never break the sale update. Log and move on.
  RAISE WARNING 'notify_sale_concluded failed for sale %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_sale_concluded ON public.sales;
CREATE TRIGGER trg_notify_sale_concluded
  AFTER UPDATE OF status ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sale_concluded();
