// whatsapp-connect — provisions the org's Chatwoot account + an Evolution instance,
// then returns a QR code (base64 PNG) for the client to scan inside Senvia OS.
// Idempotent: safe to call repeatedly.
//
// Chatwoot wiring is intentionally NOT done here — it runs from whatsapp-status
// the first time the instance reaches 'connected'. This prevents "Connection
// successfully established!" floods during QR scan and Baileys reconnect loops
// (Evolution sends events to Chatwoot the instant the integration is wired, even
// before the session is open).
//
// Multi-account: an org can have several WhatsApp channels (rows in
// messaging_channels). Pass `channel_id` to reconnect a specific channel, or omit
// it (with an optional `label`) to create a NEW channel with its own Evolution
// instance.
import {
  corsHeaders, json, getConfig, authOrgAdmin, evolutionFetch,
  ensureChatwootAccount, instanceNameForOrg, instanceNameForChannel,
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

    // Ensure the org has its own Chatwoot account (creates it if absent).
    // Called here — not just in whatsapp-status — so the account exists before
    // we need to wire it after the WhatsApp session connects.
    await ensureChatwootAccount(admin, cfg, org);

    // Resolve the target channel row: reconnect an existing one (by id) or
    // create a new one. New channels get a per-channel instance name so multiple
    // WhatsApp numbers never collide.
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

    // Persist the instance name IMMEDIATELY so status polls resolve to the right
    // instance before the slow Evolution provisioning completes.
    if (!channelRow.evolution_instance) {
      await admin
        .from('messaging_channels')
        .update({ evolution_instance: instanceName })
        .eq('id', channelRow.id);
    }

    // Read current Evolution state (single call, reused for all decisions below).
    let evolutionState: string | undefined;
    let evolutionQr: string | null = null;
    const stateRes = await evolutionFetch(cfg, `/instance/connectionState/${instanceName}`);
    if (stateRes.ok) {
      const stateData = await stateRes.json();
      evolutionState = stateData?.instance?.state;
      evolutionQr = stateData?.instance?.qrcode?.base64 ?? null;
    }

    // Fast-path: already open — do NOT call /instance/connect/ as that
    // disconnects the active session and triggers Chatwoot event spam.
    if (evolutionState === 'open') {
      await admin.from('messaging_channels')
        .update({ status: 'connected', needs_repair: false })
        .eq('id', channelRow.id);
      return json({ success: true, channel_id: channelRow.id, instance: instanceName, already_connected: true, qr: null, pairing_code: null });
    }

    // Mid-connection guard: if Baileys is completing a QR handshake, calling
    // /instance/connect/ again regenerates the QR and invalidates the scan —
    // the phone gets stuck on "A ligar..." and the connection never completes.
    // Return what we have from connectionState; the 4s whatsapp-status poll
    // detects 'open' as soon as the handshake finishes.
    if (evolutionState === 'connecting') {
      return json({
        success: true,
        channel_id: channelRow.id,
        instance: instanceName,
        chatwoot_inbox_id: channelRow.chatwoot_inbox_id ?? null,
        qr: evolutionQr,   // may be null on Evolution builds that omit it
        pairing_code: null,
        already_connected: false,
      });
    }

    // Check if the Evolution instance exists.
    const fetchRes = await evolutionFetch(cfg, `/instance/fetchInstances?instanceName=${instanceName}`);
    const existing = fetchRes.ok ? await fetchRes.json() : [];
    const instanceExists = Array.isArray(existing) && existing.length > 0;

    // Recreate unless Baileys is mid-connection. Use Evolution state as source
    // of truth — DB status can be stale (e.g. 'connected' after a session dies).
    const shouldRecreate = instanceExists && evolutionState !== 'connecting';

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

    // Persist channel state + flap reset. When recreating, clear chatwoot_inbox_id
    // so whatsapp-status re-wires the Chatwoot integration after the new session
    // connects (the old instance is gone, so its webhook target is gone too).
    // Always 'connecting' — Evolution confirmed NOT 'open' above.
    await admin
      .from('messaging_channels')
      .update({
        evolution_instance: instanceName,
        ...(shouldRecreate ? { chatwoot_inbox_id: null } : {}),
        status: 'connecting',
        needs_repair: false,
        flap_count: 0,
        flap_window_start: null,
      })
      .eq('id', channelRow.id);

    // Fetch the QR code.
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
      chatwoot_inbox_id: channelRow.chatwoot_inbox_id ?? null,
      qr: connect.base64 ?? null,
      pairing_code: connect.pairingCode ?? null,
      already_connected: !connect.base64 && !connect.pairingCode,
    });
  } catch (err) {
    console.error('whatsapp-connect error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
