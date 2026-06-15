-- Attachment bytes (base64), fetched on demand by the gateway when the user
-- clicks to download. Kept out of the default message query to stay light.
ALTER TABLE public.email_attachments ADD COLUMN IF NOT EXISTS data_b64 text;
