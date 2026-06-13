-- BUG #12 — make the inbox realtime + presence channels PRIVATE.
--
-- The channels `inbox-<orgId>` (live message nudges) and `inbox-presence-<orgId>`
-- (agent collision/typing presence, which broadcasts {userId, name,
-- conversationId}) were public: anyone with the bundled anon key and an org UUID
-- could subscribe and watch who is talking to whom. Realtime Authorization gates
-- private channels through RLS on realtime.messages. This ONLY affects channels
-- the client opens with { config: { private: true } } — public channels used
-- elsewhere in the app are untouched.
--
-- The org id is the trailing UUID of the topic (inbox-<uuid> and
-- inbox-presence-<uuid> both end in the 36-char UUID).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Inbox: org members read realtime" ON realtime.messages;
CREATE POLICY "Inbox: org members read realtime"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    realtime.topic() LIKE 'inbox-%'
    AND public.is_org_member(
      auth.uid(),
      (substring(realtime.topic() FROM '[0-9a-fA-F-]{36}$'))::uuid
    )
  );

DROP POLICY IF EXISTS "Inbox: org members send realtime" ON realtime.messages;
CREATE POLICY "Inbox: org members send realtime"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    realtime.topic() LIKE 'inbox-%'
    AND public.is_org_member(
      auth.uid(),
      (substring(realtime.topic() FROM '[0-9a-fA-F-]{36}$'))::uuid
    )
  );
