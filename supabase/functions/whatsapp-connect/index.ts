// whatsapp-connect — provisions the org's Chatwoot account + Evolution instance
// (with the Chatwoot integration wired), then returns a QR code (base64 PNG) for
// the client to scan inside Senvia OS. Idempotent: safe to call repeatedly.
import {
  corsHeaders, json, getConfig, authOrgAdmin, evolutionFetch,
  ensureChatwootAccount, instanceNameForOrg,
} from '../_shared/multicanal.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const cfg = getConfig();
    if (!cfg.evolutionUrl || !cfg.evolutionKey || !cfg.chatwootUrl) {
      return json({ error: 'Integração não configurada (secrets em falta)' }, 500);
    }

    const { organization_id } = await req.json().catch(() => ({}));
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

    // 2) Ensure the Evolution instance exists
    const instanceName = instanceNameForOrg(org.id);
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

    // 3) Wire the Chatwoot integration on the instance (idempotent set)
    const setRes = await evolutionFetch(cfg, `/chatwoot/set/${instanceName}`, 'POST', {
      enabled: true,
      accountId: String(accountId),
      token,
      url: cfg.chatwootUrl,
      signMsg: true,
      signDelimiter: '\n',
      nameInbox: 'WhatsApp',
      reopenConversation: true,
      conversationPending: false,
      mergeBrazilContacts: false,
      // History import is disabled: WhatsApp's LID identifiers make imported
      // chats messy (duplicates, broken send routing). The inbox starts clean
      // and fills with live conversations, which route correctly.
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

    // 4) Upsert the channel row
    await admin
      .from('messaging_channels')
      .upsert({
        organization_id: org.id,
        channel_type: 'whatsapp',
        provider: 'evolution',
        evolution_instance: instanceName,
        status: 'connecting',
      }, { onConflict: 'organization_id,channel_type' });

    // 5) Fetch the QR code
    const connectRes = await evolutionFetch(cfg, `/instance/connect/${instanceName}`);
    if (!connectRes.ok) {
      console.error('Evolution connect failed:', connectRes.status, await connectRes.text());
      return json({ error: 'Falha ao obter QR code' }, 502);
    }
    const connect = await connectRes.json();

    return json({
      success: true,
      instance: instanceName,
      account_id: accountId,
      qr: connect.base64 ?? null,        // data:image/png;base64,... ready for <img src>
      pairing_code: connect.pairingCode ?? null,
      already_connected: !connect.base64 && !connect.pairingCode,
    });
  } catch (err) {
    console.error('whatsapp-connect error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
