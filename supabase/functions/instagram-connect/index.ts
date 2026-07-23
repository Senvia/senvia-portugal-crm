// instagram-connect — OAuth flow for Instagram via Facebook Login.
// Instagram is a Chatwoot-native channel (Meta Graph API), NOT Evolution.
//
// Flow:
// 1. Frontend calls `oauth_url` → gets Facebook login URL
// 2. User logs in on Facebook, grants permissions
// 3. Facebook redirects to this edge function (GET) with ?code=...&state=...
// 4. We exchange code → token → fetch pages → find IG Business → create Chatwoot inbox
// 5. Post message back to opener popup
import {
  corsHeaders, json, getConfig, authOrgAdmin, chatwootFetch, ensureChatwootAccount,
} from '../_shared/multicanal.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FB_SCOPES = [
  'instagram_manage_messages',
  'pages_manage_metadata',
  'pages_read_engagement',
  'pages_show_list',
].join(',');

function htmlResponse(script: string): Response {
  return new Response(`<html><body><script>${script}</script></body></html>`,
    { headers: { 'Content-Type': 'text/html' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // ── GET: OAuth callback from Facebook ──────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorReason = url.searchParams.get('error_reason');

      if (error || !code) {
        const msg = errorReason || error || 'Autorização negada';
        return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:${JSON.stringify(msg)}},'*');window.close();`);
      }

      const cfg = getConfig();
      const appId = Deno.env.get('FACEBOOK_APP_ID');
      const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');
      if (!appId || !appSecret) {
        return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:'FACEBOOK_APP_ID/SECRET não configurados'},'*');window.close();`);
      }

      let stateData: { org?: string; label?: string } = {};
      try { stateData = JSON.parse(atob(state || '')); } catch { /* ignore */ }
      const orgId = stateData.org;
      const label = stateData.label || 'Instagram';
      if (!orgId) {
        return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:'Org não encontrada no state'},'*');window.close();`);
      }

      const redirectUri = `${cfg.supabaseUrl}/functions/v1/instagram-connect`;
      const admin = createClient(cfg.supabaseUrl, cfg.serviceKey);

      // 1. Exchange code for token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v22.0/oauth/access_token?${new URLSearchParams({
          client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code,
        })}`,
      );
      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        console.error('[instagram-connect] token exchange failed:', tokenRes.status, errBody);
        return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:'Falha ao obter token: ${errBody.slice(0, 200)}'},'*');window.close();`);
      }
      const tokenData = await tokenRes.json();
      const userToken = tokenData.access_token;
      if (!userToken) {
        return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:'Token vazio'},'*');window.close();`);
      }

      // Debug: who is this user?
      const meRes = await fetch('https://graph.facebook.com/v19.0/me?fields=id,name',
        { headers: { Authorization: `Bearer ${userToken}` } });
      const meBody = await meRes.json();
      console.log('[instagram-connect] /me:', JSON.stringify(meBody));

      // 2. Get Facebook Pages the user manages
      const pagesRes = await fetch(
        'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token&limit=100',
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      const pagesBody = await pagesRes.json();
      console.log('[instagram-connect] pages status:', pagesRes.status);
      console.log('[instagram-connect] pages body:', JSON.stringify(pagesBody).slice(0, 1000));

      // Also check what permissions were actually granted
      const permsRes = await fetch(
        'https://graph.facebook.com/v22.0/me/permissions',
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      const permsBody = await permsRes.json();
      console.log('[instagram-connect] permissions:', JSON.stringify(permsBody));

      const pages: Array<{ id: string; name: string; access_token: string }> = pagesBody.data || [];
      if (pages.length === 0) {
        const rawBody = JSON.stringify(pagesBody).slice(0, 500);
        const perms = (permsBody?.data || []).map((p: any) => p.permission).join(', ');
        return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:${JSON.stringify('Sem páginas. Perms: ' + perms + ' | Resposta: ' + rawBody)}},'*');window.close();`);
      }

      // 3. Find page with Instagram Business account
      let igPage: { id: string; name: string; access_token: string; ig_account_id?: string; ig_username?: string } | null = null;
      for (const page of pages) {
        try {
          const igRes = await fetch(
            `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account{id,username}`,
            { headers: { Authorization: `Bearer ${page.access_token}` } },
          );
          if (igRes.ok) {
            const igData = await igRes.json();
            if (igData?.instagram_business_account?.id) {
              igPage = {
                ...page,
                ig_account_id: igData.instagram_business_account.id,
                ig_username: igData.instagram_business_account.username,
              };
              break;
            }
          }
        } catch (e) {
          console.warn('[instagram-connect] IG check failed for page', page.id, e);
        }
      }

      if (!igPage) {
        const pageNames = pages.map(p => p.name).join(', ');
        return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:${JSON.stringify('Nenhuma das tuas Páginas (' + pageNames + ') tem Instagram Business ligado. Vai a facebook.com/pages → Configurações → Instagram → Ligar conta.')}},'*');window.close();`);
      }

      // 4. Get Chatwoot account
      const { data: orgData } = await admin
        .from('organizations')
        .select('id, name, chatwoot_account_id, chatwoot_account_token')
        .eq('id', orgId)
        .single();
      if (!orgData) {
        return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:'Org não encontrada'},'*');window.close();`);
      }

      const { accountId, token } = await ensureChatwootAccount(admin, cfg, orgData);

      // 5. Create Chatwoot inbox
      const cwRes = await chatwootFetch(cfg, token, `/api/v1/accounts/${accountId}/inboxes`, 'POST', {
        name: label.trim(),
        channel: {
          type: 'instagram',
          page_id: igPage.id,
          page_access_token: igPage.access_token,
        },
      });
      if (!cwRes.ok) {
        const errText = await cwRes.text();
        console.error('[instagram-connect] Chatwoot create failed:', cwRes.status, errText);
        return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:'Erro ao criar caixa no Chatwoot'},'*');window.close();`);
      }
      const cwInbox = await cwRes.json();
      const inboxId = cwInbox?.id;

      // 6. Insert DB row
      const { error: insertErr } = await admin.from('messaging_channels').insert({
        organization_id: orgId, channel_type: 'instagram', provider: 'meta',
        chatwoot_inbox_id: inboxId, status: 'connected', label: label.trim(),
        metadata: {
          page_id: igPage.id, page_name: igPage.name,
          page_access_token: igPage.access_token,
          ig_account_id: igPage.ig_account_id, ig_username: igPage.ig_username,
          inbox_name: cwInbox?.name ?? label.trim(),
        },
      });

      if (insertErr) {
        console.error('[instagram-connect] DB insert error:', insertErr);
        await chatwootFetch(cfg, token, `/api/v1/accounts/${accountId}/inboxes/${inboxId}`, 'DELETE');
        return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:'Erro ao guardar na BD'},'*');window.close();`);
      }

      return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',success:true,ig_username:${JSON.stringify(igPage.ig_username || '')}},'*');window.close();`);
    } catch (err) {
      console.error('[instagram-connect] GET error:', err);
      return htmlResponse(`window.opener?.postMessage({type:'instagram-oauth',error:${JSON.stringify(String(err))}},'*');window.close();`);
    }
  }

  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  // ── POST: oauth_url + delete ───────────────────────────────────────────────
  try {
    const cfg = getConfig();
    const body = await req.json().catch(() => ({}));
    const { action, organization_id } = body;
    if (!organization_id) return json({ error: 'organization_id em falta' }, 400);

    const auth = await authOrgAdmin(req, cfg, organization_id);
    if ('error' in auth) return auth.error;
    const { admin } = auth;

    const appId = Deno.env.get('FACEBOOK_APP_ID');
    const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');
    if (!appId || !appSecret) {
      return json({ error: 'FACEBOOK_APP_ID/SECRET não configurados' }, 500);
    }

    // ── oauth_url ─────────────────────────────────────────────────────────────
    if (action === 'oauth_url') {
      const { label } = body as { label?: string };
      const state = btoa(JSON.stringify({ org: organization_id, label: label || 'Instagram' }));
      const redirectUri = `${cfg.supabaseUrl}/functions/v1/instagram-connect`;
      const url = `https://www.facebook.com/v22.0/dialog/oauth?${new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        scope: FB_SCOPES,
        response_type: 'code',
        state,
      })}`;
      return json({ url });
    }

    // ── create_with_ig_token: create Chatwoot inbox using an Instagram token directly ──
    if (action === 'create_with_ig_token') {
      const { label, ig_token } = body as { label: string; ig_token: string };
      if (!label?.trim()) return json({ error: 'Nome da caixa obrigatório' }, 400);
      if (!ig_token?.trim()) return json({ error: 'Token do Instagram obrigatório' }, 400);

      // 1. Verify the token and get the IG account info
      const igMeRes = await fetch('https://graph.instagram.com/me?fields=id,username,account_type',
        { headers: { Authorization: `Bearer ${ig_token.trim()}` } });
      if (!igMeRes.ok) {
        return json({ error: 'Token do Instagram inválido ou expirado' }, 400);
      }
      const igMe = await igMeRes.json();
      const igAccountId = igMe?.id;
      const igUsername = igMe?.username;
      const accountType = igMe?.account_type;

      if (!igAccountId) return json({ error: 'Não foi possível obter o ID do Instagram' }, 400);

      if (accountType && accountType !== 'BUSINESS') {
        return json({
          error: `A tua conta Instagram é "${accountType}". Precisa de ser Business. Vai a Instagram → Configurações → Tipo de conta → Mudar para conta profissional (Business).`,
        }, 400);
      }

      // 2. Resolve the org's Chatwoot account
      const { data: orgData } = await admin
        .from('organizations')
        .select('id, name, chatwoot_account_id, chatwoot_account_token')
        .eq('id', organization_id)
        .single();
      if (!orgData) return json({ error: 'Organização não encontrada' }, 404);

      const { accountId, token } = await ensureChatwootAccount(admin, cfg, orgData);

      // 3. Create the Chatwoot Instagram inbox
      const cwRes = await chatwootFetch(cfg, token, `/api/v1/accounts/${accountId}/inboxes`, 'POST', {
        name: label.trim(),
        channel: {
          type: 'instagram',
          page_id: String(igAccountId),
          page_access_token: ig_token.trim(),
        },
      });

      if (!cwRes.ok) {
        const errText = await cwRes.text();
        console.error('[instagram-connect] Chatwoot create failed:', cwRes.status, errText);
        return json({ error: `Erro Chatwoot (${cwRes.status})` }, 502);
      }

      const cwInbox = await cwRes.json();
      const inboxId = cwInbox?.id;
      if (!inboxId) return json({ error: 'Chatwoot não retornou o ID da caixa' }, 502);

      // 4. Insert DB row
      const { error: insertErr } = await admin
        .from('messaging_channels')
        .insert({
          organization_id,
          channel_type: 'instagram',
          provider: 'meta',
          chatwoot_inbox_id: inboxId,
          status: 'connected',
          label: label.trim(),
          metadata: {
            ig_account_id: igAccountId,
            ig_username: igUsername,
            page_id: String(igAccountId),
            page_access_token: ig_token.trim(),
            page_name: igUsername || label.trim(),
            inbox_name: cwInbox?.name ?? label.trim(),
          },
        });

      if (insertErr) {
        console.error('[instagram-connect] DB insert error:', insertErr);
        await chatwootFetch(cfg, token, `/api/v1/accounts/${accountId}/inboxes/${inboxId}`, 'DELETE');
        return json({ error: 'Erro ao guardar na BD' }, 500);
      }

      return json({ success: true, inbox_id: inboxId, ig_username: igUsername });
    }

    // ── delete ────────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { channel_id } = body as { channel_id: string };
      if (!channel_id) return json({ error: 'channel_id em falta' }, 400);

      const { data: orgData } = await admin
        .from('organizations')
        .select('id, name, chatwoot_account_id, chatwoot_account_token')
        .eq('id', organization_id)
        .single();
      if (!orgData) return json({ error: 'Organização não encontrada' }, 404);

      const { data: chRow } = await admin
        .from('messaging_channels')
        .select('id, chatwoot_inbox_id')
        .eq('id', channel_id)
        .eq('organization_id', organization_id)
        .maybeSingle();
      if (!chRow) return json({ error: 'Caixa não encontrada' }, 404);

      const { accountId, token } = await ensureChatwootAccount(admin, cfg, orgData);
      if (chRow.chatwoot_inbox_id) {
        await chatwootFetch(cfg, token, `/api/v1/accounts/${accountId}/inboxes/${chRow.chatwoot_inbox_id}`, 'DELETE');
      }

      const { error: delErr } = await admin
        .from('messaging_channels')
        .delete()
        .eq('id', channel_id)
        .eq('organization_id', organization_id);
      if (delErr) return json({ error: 'Erro ao eliminar a caixa' }, 500);

      return json({ success: true });
    }

    return json({ error: 'Ação desconhecida' }, 400);
  } catch (err) {
    console.error('[instagram-connect] POST error:', err);
    return json({ error: (err as Error).message || 'Erro interno' }, 500);
  }
});
