// One-shot repair function: re-applies the correct Evolution → Chatwoot wiring
// for all connected WhatsApp channels. Looks up the REAL inbox name from Chatwoot
// (by chatwoot_inbox_id) instead of reconstructing it from the label, which avoids
// mismatches when the label was renamed after the initial wiring.
// Auth: Supabase service role key in the Authorization header (Bearer <key>).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json, getConfig, evolutionFetch, chatwootFetch } from '../_shared/multicanal.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const cfg = getConfig();

  // Auth: must supply the service role key — this endpoint is dev/ops only.
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || token !== cfg.serviceKey) {
    return json({ error: 'Não autorizado' }, 401);
  }

  const admin = createClient(cfg.supabaseUrl, cfg.serviceKey);

  // Get all connected WhatsApp channels that are already wired to Chatwoot.
  const { data: channels, error: chErr } = await admin
    .from('messaging_channels')
    .select('id, label, evolution_instance, chatwoot_inbox_id, metadata, organization_id')
    .eq('channel_type', 'whatsapp')
    .eq('status', 'connected')
    .not('chatwoot_inbox_id', 'is', null)
    .not('evolution_instance', 'is', null);

  if (chErr || !channels?.length) {
    return json({ ok: true, repaired: 0, message: 'Nenhum canal para reparar', error: chErr?.message });
  }

  // Get org data for all orgs in one query.
  const orgIds = [...new Set(channels.map((c: any) => c.organization_id))];
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, chatwoot_account_id, chatwoot_account_token')
    .in('id', orgIds);

  const orgMap = new Map((orgs ?? []).map((o: any) => [o.id, o]));

  const results: { channel: string; status: string; inbox?: string; error?: string }[] = [];

  for (const ch of channels as any[]) {
    const org = orgMap.get(ch.organization_id);
    if (!org?.chatwoot_account_id || !org?.chatwoot_account_token) {
      results.push({ channel: ch.label, status: 'skip', error: 'org sem Chatwoot' });
      continue;
    }

    const base = `/api/v1/accounts/${org.chatwoot_account_id}`;

    // Look up the REAL inbox name from Chatwoot by its stored ID.
    // This avoids any name reconstruction that could mismatch a renamed label.
    let inboxName: string | null = null;
    try {
      const inboxRes = await chatwootFetch(cfg, org.chatwoot_account_token, `${base}/inboxes/${ch.chatwoot_inbox_id}`);
      if (inboxRes.ok) {
        const inboxData = await inboxRes.json();
        inboxName = inboxData?.name ?? inboxData?.payload?.name ?? null;
      }
    } catch (_e) { /* ignore — will fallback */ }

    if (!inboxName) {
      results.push({ channel: ch.label, status: 'skip', error: `inbox ${ch.chatwoot_inbox_id} não encontrado no Chatwoot` });
      continue;
    }

    const meta = (ch.metadata as Record<string, unknown> | null) ?? {};
    const groupsEnabled = meta.groups_enabled !== false;

    try {
      const evoRes = await evolutionFetch(cfg, `/chatwoot/set/${ch.evolution_instance}`, 'POST', {
        enabled: true,
        accountId: String(org.chatwoot_account_id),
        token: org.chatwoot_account_token,
        url: cfg.chatwootUrl,
        signMsg: true,
        signDelimiter: '\n',
        nameInbox: inboxName,
        reopenConversation: true,
        conversationPending: false,
        mergeBrazilContacts: false,
        importContacts: false,
        importMessages: false,
        daysLimitImportMessages: 7,
        autoCreate: false,
        ignoreGroups: !groupsEnabled,
        organization: org.name,
        logo: '',
      });

      if (evoRes.ok) {
        results.push({ channel: ch.label, status: 'ok', inbox: inboxName });
      } else {
        const errText = await evoRes.text();
        results.push({ channel: ch.label, status: 'error', inbox: inboxName, error: `Evolution ${evoRes.status}: ${errText.slice(0, 100)}` });
      }
    } catch (e) {
      results.push({ channel: ch.label, status: 'error', error: (e as Error).message });
    }
  }

  const repaired = results.filter((r) => r.status === 'ok').length;
  return json({ ok: true, repaired, total: channels.length, results });
});
