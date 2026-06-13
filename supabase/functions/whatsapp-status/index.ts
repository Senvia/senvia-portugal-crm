// whatsapp-status — reports the WhatsApp connection state for the org's instance
// and keeps the messaging_channels row in sync. Polled by the frontend while the
// QR modal is open.
import {
  corsHeaders, json, getConfig, authOrgAdmin, evolutionFetch, instanceNameForOrg,
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
    return { id: data.id, instance: data.evolution_instance || instanceNameForOrg(organizationId) };
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

    // Connection state
    const stateRes = await evolutionFetch(cfg, `/instance/connectionState/${instanceName}`);
    if (!stateRes.ok) {
      // Instance may not exist yet → treat as disconnected.
      return json({ status: 'disconnected', phone_number: null });
    }
    const stateData = await stateRes.json();
    const status = mapState(stateData?.instance?.state);

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

    // Sync the specific channel row (by id when known; else the org's WhatsApp row).
    const sync = admin
      .from('messaging_channels')
      .update({ status, ...(phoneNumber ? { phone_number: phoneNumber } : {}) });
    if (resolved.id) {
      await sync.eq('id', resolved.id);
    } else {
      await sync.eq('organization_id', organization_id).eq('channel_type', 'whatsapp');
    }

    return json({ status, phone_number: phoneNumber });
  } catch (err) {
    console.error('whatsapp-status error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
