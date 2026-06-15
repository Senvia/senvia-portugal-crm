// email-inbox — CRUD for email inboxes (Chatwoot email channel via IMAP/SMTP).
// Actions: create | update | delete
// All credential handling stays server-side; passwords are stored in metadata JSONB
// (protected by RLS) and never returned to the browser.
import {
  corsHeaders, json, getConfig, authOrgAdmin, chatwootFetch, ensureChatwootAccount,
} from '../_shared/multicanal.ts';

interface EmailConfig {
  email_address: string;
  imap_server: string;
  imap_port: number;
  imap_ssl: boolean;
  imap_login: string;
  imap_password?: string; // optional on update — keep existing if blank
  smtp_server: string;
  smtp_port: number;
  smtp_ssl: boolean;
  smtp_login: string;
  smtp_password?: string; // optional on update — keep existing if blank
  provider_key?: string;  // 'gmail' | 'outlook' | 'zoho' | 'custom' (UI hint only)
}

function parseChatwootError(text: string): string | null {
  try {
    const j = JSON.parse(text);
    if (j?.message) return String(j.message);
    if (j?.errors) return Object.values(j.errors as Record<string, string[]>).flat().join(', ');
  } catch (_e) { /* ignore */ }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const cfg = getConfig();
    const body = await req.json().catch(() => ({}));
    const { action, organization_id } = body;

    if (!organization_id) return json({ error: 'organization_id em falta' }, 400);

    const auth = await authOrgAdmin(req, cfg, organization_id);
    if ('error' in auth) return auth.error;
    const { admin } = auth;

    const { data: orgData, error: orgErr } = await admin
      .from('organizations')
      .select('id, name, chatwoot_account_id, chatwoot_account_token')
      .eq('id', organization_id)
      .single();
    if (!orgData || orgErr) return json({ error: 'Organização não encontrada' }, 404);

    const { accountId, token } = await ensureChatwootAccount(admin, cfg, orgData);
    const base = `/api/v1/accounts/${accountId}`;

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { label, email_config } = body as { label: string; email_config: EmailConfig };

      if (!label?.trim()) return json({ error: 'Nome da caixa obrigatório' }, 400);
      if (!email_config?.email_address?.includes('@')) return json({ error: 'Endereço de email inválido' }, 400);
      if (!email_config?.imap_server?.trim()) return json({ error: 'Servidor IMAP obrigatório' }, 400);
      if (!email_config?.smtp_server?.trim()) return json({ error: 'Servidor SMTP obrigatório' }, 400);
      if (!email_config?.imap_password) return json({ error: 'Password IMAP obrigatória' }, 400);
      if (!email_config?.smtp_password) return json({ error: 'Password SMTP obrigatória' }, 400);

      const emailNorm = email_config.email_address.toLowerCase().trim();

      // Duplicate check (same email address in this org)
      const { data: dup } = await admin
        .from('messaging_channels')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('channel_type', 'email')
        .filter('metadata->>email_address', 'eq', emailNorm)
        .maybeSingle();
      if (dup) return json({ error: 'Já existe uma caixa com este endereço de email nesta organização' }, 409);

      // Create Chatwoot email inbox.
      // Chatwoot's API uses imap_address / smtp_address (NOT imap_server/smtp_server).
      // SSL/TLS (port 465) → smtp_ssl=true, smtp_starttls_auto=false.
      // STARTTLS (port 587) → smtp_ssl=false, smtp_starttls_auto=true.
      const smtpPort = Number(email_config.smtp_port) || 587;
      const smtpSsl = email_config.smtp_ssl === true || smtpPort === 465;
      const cwRes = await chatwootFetch(cfg, token, `${base}/inboxes`, 'POST', {
        name: label.trim(),
        channel: {
          type: 'email',
          email: emailNorm,
          imap_login: (email_config.imap_login || emailNorm).trim(),
          imap_password: email_config.imap_password,
          imap_address: email_config.imap_server.trim(),
          imap_port: Number(email_config.imap_port) || 993,
          imap_ssl_tls: email_config.imap_ssl !== false,
          imap_enabled: true,
          smtp_login: (email_config.smtp_login || emailNorm).trim(),
          smtp_password: email_config.smtp_password,
          smtp_address: email_config.smtp_server.trim(),
          smtp_port: smtpPort,
          smtp_ssl: smtpSsl,
          smtp_starttls_auto: !smtpSsl,
          smtp_domain: email_config.email_address.split('@')[1] || '',
          smtp_authentication: 'login',
          smtp_openssl_verify_mode: 'none',
          smtp_enabled: true,
        },
      });

      if (!cwRes.ok) {
        const errText = await cwRes.text();
        console.error('[email-inbox] create failed:', cwRes.status, errText);
        const msg = parseChatwootError(errText);
        return json({ error: msg ?? `Erro ao criar caixa no Chatwoot (${cwRes.status})` }, 502);
      }

      const cwInbox = await cwRes.json();
      // Chatwoot wraps inbox in .payload on some versions
      const chatwootInboxId = Number((cwInbox?.payload?.id ?? cwInbox?.id) || 0);
      if (!chatwootInboxId) {
        console.error('[email-inbox] no id in response:', JSON.stringify(cwInbox));
        return json({ error: 'Chatwoot não devolveu ID da caixa criada' }, 502);
      }

      const metadata = {
        email_address: emailNorm,
        imap_server: email_config.imap_server.trim(),
        imap_port: Number(email_config.imap_port) || 993,
        imap_ssl: email_config.imap_ssl !== false,
        imap_login: (email_config.imap_login || emailNorm).trim(),
        imap_password: email_config.imap_password,
        smtp_server: email_config.smtp_server.trim(),
        smtp_port: Number(email_config.smtp_port) || 587,
        smtp_ssl: email_config.smtp_ssl === true,
        smtp_login: (email_config.smtp_login || emailNorm).trim(),
        smtp_password: email_config.smtp_password,
        provider_key: email_config.provider_key || 'custom',
      };

      const { data: channel, error: dbErr } = await admin
        .from('messaging_channels')
        .insert({
          organization_id,
          channel_type: 'email',
          provider: 'email',
          label: label.trim(),
          chatwoot_inbox_id: chatwootInboxId,
          status: 'connected',
          metadata,
        })
        .select('id')
        .single();

      if (dbErr) {
        // Rollback Chatwoot inbox to avoid orphaned inboxes leaking on the account
        console.error('[email-inbox] DB insert failed, rolling back CW inbox', chatwootInboxId, dbErr);
        await chatwootFetch(cfg, token, `${base}/inboxes/${chatwootInboxId}`, 'DELETE').catch((_e) => {});
        return json({ error: 'Erro ao guardar caixa na base de dados' }, 500);
      }

      return json({ ok: true, channel_id: channel.id, chatwoot_inbox_id: chatwootInboxId });
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────
    if (action === 'update') {
      const { channel_id, label, email_config } = body as {
        channel_id: string;
        label?: string;
        email_config?: Partial<EmailConfig>;
      };
      if (!channel_id) return json({ error: 'channel_id em falta' }, 400);

      const { data: ch } = await admin
        .from('messaging_channels')
        .select('id, label, chatwoot_inbox_id, metadata')
        .eq('id', channel_id)
        .eq('organization_id', organization_id)
        .eq('channel_type', 'email')
        .maybeSingle();
      if (!ch) return json({ error: 'Caixa não encontrada' }, 404);

      const existing = (ch.metadata as Record<string, unknown>) ?? {};

      // Merge only fields explicitly provided; keep existing passwords if blank
      const newMeta: Record<string, unknown> = { ...existing };
      if (email_config) {
        const ec = email_config;
        if (ec.email_address) newMeta.email_address = ec.email_address.toLowerCase().trim();
        if (ec.imap_server) newMeta.imap_server = ec.imap_server.trim();
        if (ec.imap_port) newMeta.imap_port = Number(ec.imap_port);
        if (ec.imap_ssl !== undefined) newMeta.imap_ssl = ec.imap_ssl;
        if (ec.imap_login) newMeta.imap_login = ec.imap_login.trim();
        if (ec.imap_password) newMeta.imap_password = ec.imap_password;
        if (ec.smtp_server) newMeta.smtp_server = ec.smtp_server.trim();
        if (ec.smtp_port) newMeta.smtp_port = Number(ec.smtp_port);
        if (ec.smtp_ssl !== undefined) newMeta.smtp_ssl = ec.smtp_ssl;
        if (ec.smtp_login) newMeta.smtp_login = ec.smtp_login.trim();
        if (ec.smtp_password) newMeta.smtp_password = ec.smtp_password;
        if (ec.provider_key) newMeta.provider_key = ec.provider_key;
      }

      // Update Chatwoot inbox (best-effort — log but don't fail).
      // Chatwoot's API uses imap_address / smtp_address (NOT imap_server/smtp_server).
      if (ch.chatwoot_inbox_id) {
        const smtpPort = Number(newMeta.smtp_port) || 587;
        const smtpSsl = newMeta.smtp_ssl === true || smtpPort === 465;
        const cwBody: Record<string, unknown> = {};
        if (label?.trim()) cwBody.name = label.trim();
        cwBody.channel = {
          email: newMeta.email_address,
          imap_login: newMeta.imap_login,
          imap_password: newMeta.imap_password,
          imap_address: newMeta.imap_server,
          imap_port: newMeta.imap_port,
          imap_ssl_tls: newMeta.imap_ssl,
          imap_enabled: true,
          smtp_login: newMeta.smtp_login,
          smtp_password: newMeta.smtp_password,
          smtp_address: newMeta.smtp_server,
          smtp_port: smtpPort,
          smtp_ssl: smtpSsl,
          smtp_starttls_auto: !smtpSsl,
          smtp_domain: String(newMeta.email_address ?? '').split('@')[1] || '',
          smtp_authentication: 'login',
          smtp_openssl_verify_mode: 'none',
          smtp_enabled: true,
        };
        const cwRes = await chatwootFetch(cfg, token, `${base}/inboxes/${ch.chatwoot_inbox_id}`, 'PATCH', cwBody);
        if (!cwRes.ok) {
          const errText = await cwRes.text();
          console.warn('[email-inbox] Chatwoot update warning:', cwRes.status, errText);
        }
      }

      const patch: Record<string, unknown> = { metadata: newMeta };
      if (label?.trim()) patch.label = label.trim();

      const { error: upErr } = await admin
        .from('messaging_channels')
        .update(patch)
        .eq('id', channel_id)
        .eq('organization_id', organization_id);
      if (upErr) {
        console.error('[email-inbox] DB update failed:', upErr);
        return json({ error: 'Erro ao atualizar a caixa' }, 500);
      }

      return json({ ok: true });
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { channel_id } = body;
      if (!channel_id) return json({ error: 'channel_id em falta' }, 400);

      const { data: ch } = await admin
        .from('messaging_channels')
        .select('id, chatwoot_inbox_id')
        .eq('id', channel_id)
        .eq('organization_id', organization_id)
        .eq('channel_type', 'email')
        .maybeSingle();
      if (!ch) return json({ error: 'Caixa não encontrada' }, 404);

      // Delete from Chatwoot first (404 = already gone, 204 = success — both ok)
      if (ch.chatwoot_inbox_id) {
        const cwRes = await chatwootFetch(cfg, token, `${base}/inboxes/${ch.chatwoot_inbox_id}`, 'DELETE');
        if (!cwRes.ok && cwRes.status !== 404 && cwRes.status !== 204) {
          console.warn('[email-inbox] Chatwoot delete warning:', cwRes.status, '— continuing DB cleanup');
        }
      }

      const { error: delErr } = await admin
        .from('messaging_channels')
        .delete()
        .eq('id', channel_id)
        .eq('organization_id', organization_id);
      if (delErr) {
        console.error('[email-inbox] DB delete failed:', delErr);
        return json({ error: 'Erro ao eliminar a caixa' }, 500);
      }

      return json({ ok: true });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);

  } catch (err) {
    console.error('[email-inbox] unhandled error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
