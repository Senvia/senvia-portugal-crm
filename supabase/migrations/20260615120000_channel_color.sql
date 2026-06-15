-- Add a custom display color to each messaging channel.
-- Shown as the badge background in the conversation list and as the filter dot.
ALTER TABLE messaging_channels ADD COLUMN IF NOT EXISTS color text;
