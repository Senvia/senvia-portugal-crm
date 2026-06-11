// whatsapp-status — reports the WhatsApp connection state for the org's instance
// and keeps the messaging_channels row in sync. Polled by the frontend while the
// QR modal is open.
import {
  corsHeaders, json, getConfig, authOrgAdmin, evolutionFetch, instanceNameForOrg,
} from '../_shared/multicanal.ts';

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
    const { organization_id } = await req.json().catch(() => ({}));
    const auth = await authOrgAdmin(req, cfg, organization_id);
    if ('error' in auth) return auth.error;
    const { admin } = auth;

    const instanceName = instanceNameForOrg(organization_id);

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

    // Sync the channel row
    await admin
      .from('messaging_channels')
      .update({ status, ...(phoneNumber ? { phone_number: phoneNumber } : {}) })
      .eq('organization_id', organization_id)
      .eq('channel_type', 'whatsapp');

    return json({ status, phone_number: phoneNumber });
  } catch (err) {
    console.error('whatsapp-status error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
