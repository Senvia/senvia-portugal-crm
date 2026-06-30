-- 20260630120000_unarchive_lead_on_whatsapp_nudge.sql
-- When a trial WhatsApp nudge is sent, unarchive any archived lead matching the phone.

CREATE OR REPLACE FUNCTION unarchive_lead_on_whatsapp_nudge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE leads
  SET archived_at = NULL
  WHERE phone = NEW.phone
    AND archived_at IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS unarchive_lead_on_nudge ON scheduled_messages;
CREATE TRIGGER unarchive_lead_on_nudge
  AFTER INSERT ON scheduled_messages
  FOR EACH ROW
  EXECUTE FUNCTION unarchive_lead_on_whatsapp_nudge();