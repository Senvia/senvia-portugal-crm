// whatsapp-connect — provisions the org's Chatwoot account + an Evolution instance
// (with the Chatwoot integration wired), then returns a QR code (base64 PNG) for
// the client to scan inside Senvia OS. Idempotent: safe to call repeatedly.
//
// Multi-account: an org can have several WhatsApp channels (rows in
// messaging_channels). Pass `channel_id` to reconnect a specific channel, or omit
// it (with an optional `label`) to create a NEW channel with its own Evolution
// instance and Chatwoot inbox.
import {
  corsHeaders, json, getConfig, authOrgAdmin, evolutionFetch,
  ensureChatwootAccount, instanceNameForOrg, instanceNameForChannel,
  findChatwootInboxByName,
} from '../_shared/multicanal.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const cfg = getConfig();
    if (!cfg.evolutionUrl || !cfg.evolutionKey || !cfg.chatwootUrl) {
      return json({ error: 'Integração não configurada (secrets em falta)' }, 500);
    }

    const { organization_id, channel_id, label } = await req.json().catch(() => ({}));
    const auth = await authOrgAdmin(req, cfg, organization_id);
    if ('error' in auth) return auth.error;
    const { admin } = auth;

    // Load the organization
    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .select('id, name, chatwoot_account_id, chatwoot_account_token')
      .eq('id', organization_id)
      .single();
    if (orgErr || !org) return json({ error: 'Organização não encontrada' }, 404);

    // 1) Ensure the org has its own Chatwoot account
    const { accountId, token } = await ensureChatwootAccount(admin, cfg, org);

    // 2) Resolve the target channel row: reconnect an existing one (by id) or
    //    create a new one. New channels get a per-channel instance name + inbox
    //    name so multiple WhatsApp numbers never collide.
    let channelRow: { id: string; evolution_instance: string | null; label: string | null; chatwoot_inbox_id: number | null } | null = null;

    if (channel_id) {
      const { data } = await admin
        .from('messaging_channels')
        .select('id, evolution_instance, label, chatwoot_inbox_id')
        .eq('id', channel_id)
        .eq('organization_id', org.id)
        .maybeSingle();
      if (!data) return json({ error: 'Caixa não encontrada' }, 404);
      channelRow = data;
    } else {
      const { data, error: insErr } = await admin
        .from('messaging_channels')
        .insert({
          organization_id: org.id,
          channel_type: 'whatsapp',
          provider: 'evolution',
          status: 'connecting',
          label: (label || '').trim() || 'WhatsApp',
        })
        .select('id, evolution_instance, label, chatwoot_inbox_id')
        .single();
      if (insErr || !data) {
        console.error('channel insert failed:', insErr);
        return json({ error: 'Falha ao criar a caixa' }, 500);
      }
      channelRow = data;
    }

    // Instance name: reuse the stored one (legacy or previously generated), else
    // derive a per-channel name for a brand new channel.
    const instanceName = channelRow.evolution_instance
      || (channel_id ? instanceNameForOrg(org.id) : instanceNameForChannel(org.id, channelRow.id));
    const inboxName = (channelRow.label || '').trim() || 'WhatsApp';

    // 3) Ensure the Evolution instance exists
    const fetchRes = await evolutionFetch(cfg, `/instance/fetchInstances?instanceName=${instanceName}`);
    const existing = fetchRes.ok ? await fetchRes.json() : [];
    const instanceExists = Array.isArray(existing) && existing.length > 0;

    if (!instanceExists) {
      const createRes = await evolutionFetch(cfg, '/instance/create', 'POST', {
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
      });
      if (!createRes.ok) {
        const text = await createRes.text();
        console.error('Evolution create failed:', createRes.status, text);
        return json({ error: 'Falha ao criar instância na Evolution' }, 502);
      }
    }

    // 4) Wire the Chatwoot integration on the instance (idempotent set). nameInbox
    //    is per-channel so each WhatsApp number maps to its own Chatwoot inbox.
    const setRes = await evolutionFetch(cfg, `/chatwoot/set/${instanceName}`, 'POST', {
      enabled: true,
      accountId: String(accountId),
      token,
      url: cfg.chatwootUrl,
      signMsg: true,
      signDelimiter: '\n',
      nameInbox: inboxName,
      reopenConversation: true,
      conversationPending: false,
      mergeBrazilContacts: false,
      // History import is disabled: WhatsApp's LID identifiers make imported
      // chats messy (duplicates, broken send routing). The inbox starts clean.
      importContacts: false,
      importMessages: false,
      daysLimitImportMessages: 7,
      autoCreate: true,
      organization: org.name,
      logo: '',
    });
    if (!setRes.ok) {
      console.error('Chatwoot set failed:', setRes.status, await setRes.text());
      // Non-fatal for the QR flow; log and continue.
    }

    // 5) Resolve and persist the Chatwoot inbox id (so sends/webhooks route per
    //    inbox). Best-effort: the autoCreate may take a moment, so we don't fail
    //    the flow if it isn't found yet — it'll be retried on the next connect.
    let inboxId = channelRow.chatwoot_inbox_id;
    if (!inboxId) {
      inboxId = await findChatwootInboxByName(cfg, accountId, token, inboxName);
    }

    // 6) Persist the channel state
    await admin
      .from('messaging_channels')
      .update({
        evolution_instance: instanceName,
        chatwoot_inbox_id: inboxId,
        status: 'connecting',
      })
      .eq('id', channelRow.id);

    // 7) Fetch the QR code
    const connectRes = await evolutionFetch(cfg, `/instance/connect/${instanceName}`);
    if (!connectRes.ok) {
      console.error('Evolution connect failed:', connectRes.status, await connectRes.text());
      return json({ error: 'Falha ao obter QR code' }, 502);
    }
    const connect = await connectRes.json();

    return json({
      success: true,
      channel_id: channelRow.id,
      instance: instanceName,
      account_id: accountId,
      chatwoot_inbox_id: inboxId,
      qr: connect.base64 ?? null,        // data:image/png;base64,... ready for <img src>
      pairing_code: connect.pairingCode ?? null,
      already_connected: !connect.base64 && !connect.pairingCode,
    });
  } catch (err) {
    console.error('whatsapp-connect error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
