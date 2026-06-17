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

    // Note: the org's Chatwoot account is ensured lazily — only when we actually
    // create a new Evolution instance (see below), not on every QR refresh.
    // Calling it here on each poll added a Chatwoot HTTP round-trip that made the
    // QR refresh feel slow. whatsapp-status also ensures it before wiring, so the
    // account is guaranteed to exist by the time it's needed.

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

    // Mid-connection guard: only when Baileys has a QR in connectionState does
    // it mean a scan is actively in flight. Calling /instance/connect/ at that
    // point regenerates the QR and cancels the handshake — phone stuck on
    // "A ligar..." forever. Return the current QR instead.
    // Without evolutionQr the instance is in a stale 'connecting' state (prior
    // attempt failed/stuck) — fall through to recreate it for a clean start.
    if (evolutionState === 'connecting' && evolutionQr) {
      return json({
        success: true,
        channel_id: channelRow.id,
        instance: instanceName,
        chatwoot_inbox_id: channelRow.chatwoot_inbox_id ?? null,
        qr: evolutionQr,
        pairing_code: null,
        already_connected: false,
      });
    }

    // Check if the Evolution instance exists.
    const fetchRes = await evolutionFetch(cfg, `/instance/fetchInstances?instanceName=${instanceName}`);
    const existing = fetchRes.ok ? await fetchRes.json() : [];
    let instanceExists = Array.isArray(existing) && existing.length > 0;

    // Create the instance only when it genuinely doesn't exist. For an existing
    // instance we do NOT delete+recreate: deleting a 'connecting' instance does
    // not free the name in time, so the immediate create fails with
    // 403 "name already in use". Instead we just call /instance/connect/ below,
    // which regenerates a fresh QR for a 'close' or stale-'connecting' instance.
    if (!instanceExists) {
      // New instance → make sure the org's Chatwoot account exists so it can be
      // wired once the session connects (only paid here, not on every refresh).
      await ensureChatwootAccount(admin, cfg, org);
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

    // Persist channel state + flap reset. Always 'connecting' — Evolution
    // confirmed the instance is NOT 'open' above.
    await admin
      .from('messaging_channels')
      .update({
        evolution_instance: instanceName,
        status: 'connecting',
        needs_repair: false,
        flap_count: 0,
        flap_window_start: null,
      })
      .eq('id', channelRow.id);

    // Fetch the QR code.
    let connectRes = await evolutionFetch(cfg, `/instance/connect/${instanceName}`);
    if (!connectRes.ok) {
      console.error('Evolution connect failed:', connectRes.status, await connectRes.text());
      return json({ error: 'Falha ao obter QR code' }, 502);
    }
    let connect = await connectRes.json();

    // Fallback: an existing instance with a corrupted session can return no QR
    // and no pairing code from /connect/. Tear it down properly (logout → delete),
    // wait for Evolution to free the name, recreate, and connect again. This is
    // the only path that deletes — and it does so safely (not racing create).
    if (instanceExists && !connect.base64 && !connect.pairingCode) {
      try { await evolutionFetch(cfg, `/instance/logout/${instanceName}`, 'DELETE'); } catch (_e) { /* ignore */ }
      try { await evolutionFetch(cfg, `/instance/delete/${instanceName}`, 'DELETE'); } catch (_e) { /* ignore */ }
      // Poll until the name is actually free (delete is async on Evolution).
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const chk = await evolutionFetch(cfg, `/instance/fetchInstances?instanceName=${instanceName}`);
        const arr = chk.ok ? await chk.json() : [];
        if (!Array.isArray(arr) || arr.length === 0) { instanceExists = false; break; }
      }
      const createRes = await evolutionFetch(cfg, '/instance/create', 'POST', {
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
      });
      if (!createRes.ok) {
        console.error('Evolution recreate failed:', createRes.status, await createRes.text());
        return json({ error: 'Falha ao recriar instância na Evolution' }, 502);
      }
      // A fresh instance has no Chatwoot wiring; clear the stored inbox id so
      // whatsapp-status re-wires it after the new session connects.
      await admin
        .from('messaging_channels')
        .update({ chatwoot_inbox_id: null })
        .eq('id', channelRow.id);
      connectRes = await evolutionFetch(cfg, `/instance/connect/${instanceName}`);
      if (!connectRes.ok) {
        console.error('Evolution connect (after recreate) failed:', connectRes.status, await connectRes.text());
        return json({ error: 'Falha ao obter QR code' }, 502);
      }
      connect = await connectRes.json();
    }

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
