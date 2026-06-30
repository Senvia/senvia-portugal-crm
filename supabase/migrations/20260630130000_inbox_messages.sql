-- 20260630130000_inbox_messages.sql
-- Stores incoming WhatsApp messages from Evolution API webhooks.

CREATE TABLE IF NOT EXISTS inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  phone text NOT NULL,
  message text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound',
  evolution_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_org ON inbox_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_phone ON inbox_messages(phone);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_created ON inbox_messages(created_at DESC);