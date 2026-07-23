-- Scheduled WhatsApp messages can now carry an attachment (image/video/document/
-- voice). The media is stored inline as base64 in `attachment` (jsonb:
-- {data, mimetype, filename, kind}) so no storage bucket is needed — scheduled
-- media is occasional and small. `attachment_name` is a cheap label the inbox's
-- "scheduled messages" bar can show WITHOUT pulling the (large) base64 payload.
ALTER TABLE public.scheduled_messages
  ADD COLUMN IF NOT EXISTS attachment jsonb,
  ADD COLUMN IF NOT EXISTS attachment_name text;

-- content was NOT NULL: an attachment-only scheduled message has empty text, so
-- relax it (default '' keeps existing inserts working).
ALTER TABLE public.scheduled_messages ALTER COLUMN content SET DEFAULT '';
ALTER TABLE public.scheduled_messages ALTER COLUMN content DROP NOT NULL;
