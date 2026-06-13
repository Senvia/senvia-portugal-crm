// whatsapp-disconnect — tears down a messaging channel properly: deletes its
// Evolution instance AND its Chatwoot inbox AND the DB row (the old delete only
// removed the row, leaving orphan Evolution instances behind).
//
// Modes:
//   { channel_id }      -> tear down ONE channel.
//   { cleanup: true }   -> remove ALL orphan (non-connected) channels of the org
//                          and any leftover Evolution instances with this org's
//                          prefix that are not a connected channel.
import {
  corsHeaders, json, getConfig, authOrgAdmin, evolutionFetch, chatwootFetch,
  getOrgChatwoot,
} from '../_shared/multicanal.ts';

// Best-effort teardown of an Evolution instance (logout then delete). Never throws.
async function deleteEvolutionInstance(cfg: ReturnType<typeof getConfig>, name: string) {
  try { await evolutionFetch(cfg, `/instance/logout/${name}`, 'DELETE'); } catch (_e) { /* ignore */ }
  try { await evolutionFetch(cfg, `/instance/delete/${name}`, 'DELETE'); } catch (_e) { /* ignore */ }
}

async function deleteChatwootInbox(
  cfg: ReturnType<typeof getConfig>,
  admin: any,
  organizationId: string,
  inboxId: number,
) {
  try {
    const cw = await getOrgChatwoot(admin, organizationId);
    if (cw) await chatwootFetch(cfg, cw.token, `/api/v1/accounts/${cw.accountId}/inboxes/${inboxId}`, 'DELETE');
  } catch (_e) { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const cfg = getConfig();
    const { organization_id, channel_id, cleanup, logout } = await req.json().catch(() => ({}));
    const auth = await authOrgAdmin(req, cfg, organization_id);
    if ('error' in auth) return auth.error;
    const { admin } = auth;

    // ===== Logout: end the WhatsApp session but KEEP the instance + row, so it can
    // be reconnected later (re-scan QR on the SAME instance). =====
    if (logout && channel_id) {
      const { data: row } = await admin
        .from('messaging_channels')
        .select('id, evolution_instance')
        .eq('id', channel_id)
        .eq('organization_id', organization_id)
        .maybeSingle();
      if (!row) return json({ error: 'Caixa não encontrada' }, 404);
      if (row.evolution_instance) {
        try { await evolutionFetch(cfg, `/instance/logout/${row.evolution_instance}`, 'DELETE'); } catch (_e) { /* ignore */ }
      }
      await admin
        .from('messaging_channels')
        .update({ status: 'disconnected', phone_number: null })
        .eq('id', channel_id);
      return json({ ok: true, disconnected: true });
    }

    // ===== Cleanup mode: remove orphan instances + non-connected rows =====
    if (cleanup) {
      // Instances to KEEP = the org's currently connected channels.
      const { data: keepRows } = await admin
        .from('messaging_channels')
        .select('evolution_instance')
        .eq('organization_id', organization_id)
        .eq('status', 'connected');
      const keep = new Set((keepRows || []).map((r: any) => r.evolution_instance).filter(Boolean));

      const prefix = `senvia-${organization_id.slice(0, 8)}`;
      const fetchRes = await evolutionFetch(cfg, '/instance/fetchInstances');
      const list = fetchRes.ok ? await fetchRes.json() : [];
      const names: string[] = (Array.isArray(list) ? list : [])
        .map((i: any) => i?.name ?? i?.instanceName ?? i?.instance?.instanceName)
        .filter((n: any): n is string => typeof n === 'string');

      const toDelete = names.filter((n) => n.startsWith(prefix) && !keep.has(n));
      for (const n of toDelete) await deleteEvolutionInstance(cfg, n);

      // Remove the non-connected rows of this org.
      const { data: delRows } = await admin
        .from('messaging_channels')
        .delete()
        .eq('organization_id', organization_id)
        .neq('status', 'connected')
        .select('id');

      return json({
        ok: true,
        deleted_instances: toDelete,
        deleted_rows: (delRows || []).length,
        kept_instances: [...keep],
      });
    }

    // ===== Single-channel teardown =====
    if (!channel_id) return json({ error: 'channel_id ou cleanup em falta' }, 400);

    const { data: row } = await admin
      .from('messaging_channels')
      .select('id, evolution_instance, chatwoot_inbox_id')
      .eq('id', channel_id)
      .eq('organization_id', organization_id)
      .maybeSingle();
    if (!row) return json({ error: 'Caixa não encontrada' }, 404);

    if (row.evolution_instance) await deleteEvolutionInstance(cfg, row.evolution_instance);
    if (row.chatwoot_inbox_id) await deleteChatwootInbox(cfg, admin, organization_id, row.chatwoot_inbox_id);
    await admin.from('messaging_channels').delete().eq('id', channel_id);

    return json({ ok: true });
  } catch (err) {
    console.error('whatsapp-disconnect error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
