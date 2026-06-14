// whatsapp-status — reports the WhatsApp connection state for the org's instance
// and keeps the messaging_channels row in sync. Polled by the frontend while the
// QR modal is open.
//
// On first successful connection (status becomes 'connected' and chatwoot_inbox_id
// is still null), wires the Chatwoot integration and stores the inbox id. Doing it
// here — not in whatsapp-connect — keeps Evolution silent until the session is
// actually open, preventing event floods during QR scan and reconnect loops.
import {
  corsHeaders, json, getConfig, authOrgAdmin, evolutionFetch, instanceNameForOrg,
  ensureChatwootAccount, findChatwootInboxByName,
} from '../_shared/multicanal.ts';

// Resolve which channel/instance to check: by channel_id (multi-account), else
// the org's first WhatsApp channel (backward compatible with the single-channel
// callers). Returns the row id + instance name, or null when there is none.
async function resolveChannel(
  admin: { from: (t: string) => any },
  organizationId: string,
  channelId?: string,
): Promise<{ id: string | null; instance: string } | null> {
  if (channelId) {
    const { data } = await admin
      .from('messaging_channels')
      .select('id, evolution_instance')
      .eq('id', channelId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!data) return null;
    // Do NOT fall back to the org's legacy instance for a SPECIFIC channel: a null
    // instance means it isn't provisioned yet (report disconnected), never "use the
    // other channel" — that caused a new caixa to show the existing number as connected.
    return { id: data.id, instance: data.evolution_instance || '' };
  }
  const { data } = await admin
    .from('messaging_channels')
    .select('id, evolution_instance')
    .eq('organization_id', organizationId)
    .eq('channel_type', 'whatsapp')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return { id: data?.id ?? null, instance: data?.evolution_instance || instanceNameForOrg(organizationId) };
}

// Map Evolution connection states to our channel status vocabulary.
function mapState(state: string | undefined): 'connected' | 'connecting' | 'disconnected' {
  if (state === 'open') return 'connected';
  if (state === 'connecting') return 'connecting';
  return 'disconnected';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const cfg = getConfig();
    const { organization_id, channel_id } = await req.json().catch(() => ({}));
    const auth = await authOrgAdmin(req, cfg, organization_id);
    if ('error' in auth) return auth.error;
    const { admin } = auth;

    const resolved = await resolveChannel(admin, organization_id, channel_id);
    if (!resolved) return json({ status: 'disconnected', phone_number: null });
    const instanceName = resolved.instance;
    // Channel exists but has no instance yet (still being provisioned) -> not connected.
    if (!instanceName) return json({ status: 'connecting', phone_number: null });

    // Connection state
    const stateRes = await evolutionFetch(cfg, `/instance/connectionState/${instanceName}`);
    if (!stateRes.ok) {
      // Instance may not exist yet → treat as disconnected.
      return json({ status: 'disconnected', phone_number: null, qr: null });
    }
    const stateData = await stateRes.json();
    const status = mapState(stateData?.instance?.state);

    // Some Evolution builds include the current QR in the connectionState response
    // (instance.qrcode.base64). Reading it here is free — no extra API call, no
    // new QR generation, no Chatwoot event. When present, the modal can auto-display
    // fresh QRs as Baileys regenerates them without ever calling /instance/connect/
    // again.
    const qr: string | null = status === 'connecting'
      ? (stateData?.instance?.qrcode?.base64 ?? null)
      : null;

    // When connected, resolve the phone number from the instance owner JID.
    let phoneNumber: string | null = null;
    if (status === 'connected') {
      const fetchRes = await evolutionFetch(cfg, `/instance/fetchInstances?instanceName=${instanceName}`);
      if (fetchRes.ok) {
        const list = await fetchRes.json();
        const ownerJid: string | undefined = Array.isArray(list) ? list[0]?.ownerJid : undefined;
        if (ownerJid) phoneNumber = ownerJid.split('@')[0] || null;
      }
    }

    // Wire Chatwoot on first successful connection (chatwoot_inbox_id not yet set).
    // Evolution only starts sending events to Chatwoot AFTER /chatwoot/set/ is called,
    // so delaying until here means no events reach Chatwoot during QR scan or
    // Baileys reconnect loops.
    if (status === 'connected' && resolved.id) {
      const { data: chRow } = await admin
        .from('messaging_channels')
        .select('chatwoot_inbox_id, label')
        .eq('id', resolved.id)
        .maybeSingle();
      if (chRow && !chRow.chatwoot_inbox_id) {
        try {
          const { data: orgData } = await admin
            .from('organizations')
            .select('id, name, chatwoot_account_id, chatwoot_account_token')
            .eq('id', organization_id)
            .single();
          if (orgData) {
            const { accountId, token } = await ensureChatwootAccount(admin, cfg, orgData);
            const baseLabel = (chRow.label || '').trim() || 'WhatsApp';
            const isLegacy = instanceName === instanceNameForOrg(organization_id);
            const inboxName = isLegacy ? baseLabel : `${baseLabel} ${resolved.id.slice(0, 6)}`;
            await evolutionFetch(cfg, `/chatwoot/set/${instanceName}`, 'POST', {
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
              organization: orgData.name,
              logo: '',
            });
            const inboxId = await findChatwootInboxByName(cfg, accountId, token, inboxName);
            if (inboxId) {
              await admin
                .from('messaging_channels')
                .update({ chatwoot_inbox_id: inboxId })
                .eq('id', resolved.id);
            }
          }
        } catch (e) {
          console.error('Chatwoot wiring error:', e);
        }
      }
    }

    // Sync the specific channel row (by id when known; else the org's WhatsApp row).
    const sync = admin
      .from('messaging_channels')
      .update({ status, ...(phoneNumber ? { phone_number: phoneNumber } : {}) });
    if (resolved.id) {
      await sync.eq('id', resolved.id);
    } else {
      await sync.eq('organization_id', organization_id).eq('channel_type', 'whatsapp');
    }

    return json({ status, phone_number: phoneNumber, qr });
  } catch (err) {
    console.error('whatsapp-status error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
