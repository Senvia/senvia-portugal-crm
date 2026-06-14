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
    let channelRow: { id: string; evolution_instance: string | null; label: string | null; chatwoot_inbox_id: number | null; status: string | null } | null = null;

    if (channel_id) {
      const { data } = await admin
        .from('messaging_channels')
        .select('id, evolution_instance, label, chatwoot_inbox_id, status')
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
        .select('id, evolution_instance, label, chatwoot_inbox_id, status')
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
    // Chatwoot inbox name must be STABLE per channel across BOTH connect and reconnect.
    // If a reconnect used the bare label, a 2nd number would re-attach to the 1st
    // channel's inbox and hijack its outbound webhook (Chatwoot keeps one webhook_url
    // per inbox, last writer wins). The org's legacy first channel (its instance equals
    // instanceNameForOrg) keeps the bare-label inbox (e.g. "WhatsApp"); every other
    // channel uses label + short id, matching the name it was created with. Keyed on the
    // instance name, NOT on channel_id, so reconnect agrees with the original create.
    const baseLabel = (channelRow.label || '').trim() || 'WhatsApp';
    const isLegacyChannel = channelRow.evolution_instance === instanceNameForOrg(org.id);
    const inboxName = isLegacyChannel ? baseLabel : `${baseLabel} ${channelRow.id.slice(0, 6)}`;

    // Persist the instance name IMMEDIATELY (before the slow Evolution/Chatwoot
    // provisioning) so a status poll for THIS channel resolves to its own instance
    // right away, instead of falling back to another channel and reporting a wrong
    // "connected" while we wait.
    if (!channelRow.evolution_instance) {
      await admin
        .from('messaging_channels')
        .update({ evolution_instance: instanceName })
        .eq('id', channelRow.id);
    }

    // 3) Ensure a FRESH Evolution instance exists. If the channel was in a failed/
    //    connecting state and the instance already exists, its Baileys session can
    //    have stale or corrupted pairing state — the phone will get "Connecting..."
    //    and never finish. Fix: delete the old instance so Baileys starts clean.
    //    We only keep an existing instance when the channel is already connected
    //    (unnecessary restart) or when there is no instance to begin with.
    const fetchRes = await evolutionFetch(cfg, `/instance/fetchInstances?instanceName=${instanceName}`);
    const existing = fetchRes.ok ? await fetchRes.json() : [];
    const instanceExists = Array.isArray(existing) && existing.length > 0;

    // Only recreate when the channel is 'disconnected' (stale/ended session). When
    // it is 'connecting' we are in the middle of a pairing flow — destroying the
    // instance would cancel a scan that may be in progress. The 'connecting' state
    // is transient; a fresh QR refresh just calls /instance/connect/ again which
    // returns the current (or a freshly generated) QR without rebuilding anything.
    const shouldRecreate = instanceExists && channelRow?.status === 'disconnected';

    if (shouldRecreate) {
      await evolutionFetch(cfg, `/instance/delete/${instanceName}`, 'DELETE');
    }

    if (!instanceExists || shouldRecreate) {
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

    // 4) Wire Chatwoot BEFORE fetching the QR. This ensures that when /chatwoot/set/
    //    causes any internal Evolution session reload, that reload happens BEFORE the
    //    QR is generated — so the QR the user sees is stable and not invalidated mid-scan
    //    by a background wiring call. QR events reaching Chatwoot during setup are
    //    acceptable: they are detected as evo_status and skipped (no AI/push), and the
    //    flap guard no longer counts them, so they cannot kill the session.
    const needsChatwootWiring = !instanceExists || shouldRecreate || !channelRow.chatwoot_inbox_id;
    if (needsChatwootWiring) {
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
        importContacts: false,
        importMessages: false,
        daysLimitImportMessages: 7,
        autoCreate: true,
        organization: org.name,
        logo: '',
      });
      if (!setRes.ok) {
        console.error('Chatwoot set failed:', setRes.status, await setRes.text());
      }
    }

    // 5) Resolve inbox id (needed for send/webhook routing).
    let inboxId = channelRow.chatwoot_inbox_id;
    if (!inboxId) {
      inboxId = await findChatwootInboxByName(cfg, accountId, token, inboxName);
    }

    // 6) Persist channel state + flap reset. Don't overwrite 'connected' with
    //    'connecting' — the QR auto-refresh calls this function every 20s and
    //    would otherwise reset a freshly-connected channel back to "Por ligar".
    const newStatus = channelRow.status === 'connected' ? 'connected' : 'connecting';
    await admin
      .from('messaging_channels')
      .update({
        evolution_instance: instanceName,
        chatwoot_inbox_id: inboxId,
        status: newStatus,
        needs_repair: false,
        flap_count: 0,
        flap_window_start: null,
      })
      .eq('id', channelRow.id);

    // 7) Fetch the QR code — after wiring so the session is stable.
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
