-- Add muted_conversation_ids to push_subscriptions so the edge function can
-- skip push delivery for conversations the user has silenced in the inbox.
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS muted_conversation_ids integer[] NOT NULL DEFAULT '{}';
