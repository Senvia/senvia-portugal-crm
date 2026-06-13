-- ============================================================================
-- Caixas de Entrada — multi-account support for messaging_channels.
-- Removes the "1 channel per type per org" limit so an organization can connect
-- several accounts of the same channel (e.g. 4 WhatsApp numbers). Each row is now
-- an independent inbox, identified by its own Evolution instance and Chatwoot
-- inbox id. A friendly `label` distinguishes them in the UI.
--
-- Backward compatible: existing single-channel rows keep working. The new routing
-- (send/webhook by chatwoot_inbox_id) falls back to the legacy single-instance
-- behaviour when a row has no inbox id yet.
-- ============================================================================

-- 1) Drop the hard 1-per-type constraint.
ALTER TABLE public.messaging_channels
  DROP CONSTRAINT IF EXISTS unique_org_channel;

-- 2) Friendly name per inbox (e.g. "Vendas", "Suporte").
ALTER TABLE public.messaging_channels
  ADD COLUMN IF NOT EXISTS label text;

-- 3) Keep Evolution instance names globally unique (they already are per the
--    naming scheme); prevents two rows pointing at the same instance.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_messaging_channels_evolution_instance
  ON public.messaging_channels (evolution_instance)
  WHERE evolution_instance IS NOT NULL;

-- 4) Route inbound webhooks / outbound sends by Chatwoot inbox id.
CREATE INDEX IF NOT EXISTS idx_messaging_channels_chatwoot_inbox
  ON public.messaging_channels (chatwoot_inbox_id)
  WHERE chatwoot_inbox_id IS NOT NULL;

-- 5) Backfill a default label for existing rows so the UI has something to show.
--    WhatsApp keeps the exact casing of its existing Chatwoot inbox ("WhatsApp")
--    so a reconnect matches that inbox instead of creating a duplicate.
UPDATE public.messaging_channels
SET label = CASE WHEN channel_type = 'whatsapp' THEN 'WhatsApp' ELSE initcap(channel_type) END
WHERE label IS NULL;

-- ============================================================================
-- RPC: merge metadata for a SPECIFIC channel (by id), for the multi-account UI.
-- The existing merge_messaging_channel_metadata(p_org_id, p_channel_type, ...)
-- stays for backward compatibility but is ambiguous when an org has several
-- channels of the same type, so per-channel config uses this one.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.merge_messaging_channel_metadata_by_id(
  p_channel_id uuid,
  p_patch jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org
  FROM public.messaging_channels
  WHERE id = p_channel_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Channel not found';
  END IF;

  -- Same authorization as the per-type RPC: org admin (or super admin).
  IF NOT (is_org_member(auth.uid(), v_org) AND has_role(auth.uid(), 'admin'::app_role))
     AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.messaging_channels
  SET metadata = COALESCE(metadata, '{}'::jsonb) || p_patch,
      updated_at = now()
  WHERE id = p_channel_id;
END;
$$;
