// meta-connect — Facebook Login for Business: liga Instagram e Messenger.
//
// Substitui o antigo instagram-connect, feito para o Facebook Login NORMAL. A
// diferença que importa: o Login for Business não recebe as permissões no URL
// (`scope=`), recebe o id de uma CONFIGURAÇÃO criada no painel (`config_id`).
// Passar `scope` a esta API faz o diálogo não carregar, com um erro que nada diz
// sobre a causa.
//
// Fluxo:
//   POST {action:'oauth_url', organization_id, connect:'instagram'|'messenger'}
//        -> devolve o URL do diálogo, com um `state` assinado
//   GET  ?code=...&state=...
//        -> troca o código, encontra a Página, subscreve-a aos nossos webhooks
//           e cria a linha em messaging_channels
//   GET  ?action=login[&config_id=]  -> arranque manual, para testar sem UI
//   GET|POST ?action=deauthorize     -> callback de desautorização da Meta
//
// O `state` vai assinado com o App Secret: o callback chega pelo browser, sem
// autenticação nenhuma, e sem assinatura qualquer pessoa podia mandar-nos criar
// caixas numa organização à escolha dela.

import { createClient } from "npm:@supabase/supabase-js@2.57.2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.facebook.com/v21.0";

const log = (s: string, d?: unknown) =>
  console.log(`[META-CONNECT] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);
const logError = (s: string, d?: unknown) =>
  console.error(`[META-CONNECT] ERROR ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

// ── state assinado ──────────────────────────────────────────────────────────

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signState(data: Record<string, string>, secret: string): Promise<string> {
  const payload = btoa(JSON.stringify(data));
  return `${payload}.${await hmac(payload, secret)}`;
}

async function readState(state: string, secret: string): Promise<Record<string, string> | null> {
  const [payload, sig] = state.split(".", 2);
  if (!payload || !sig) return null;
  if (await hmac(payload, secret) !== sig) return null;
  try { return JSON.parse(atob(payload)); } catch { return null; }
}

// ── página de resultado ─────────────────────────────────────────────────────

function page(title: string, bodyHtml: string, ok = true): Response {
  return new Response(
    `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Senvia OS</title>
<style>
 body{font-family:system-ui,-apple-system,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1.5rem;line-height:1.6;color:#0f172a}
 h1{font-size:1.4rem;margin-bottom:.25rem}
 .tag{display:inline-block;padding:.15rem .55rem;border-radius:999px;font-size:.75rem;font-weight:600;
      background:${ok ? "#dcfce7" : "#fee2e2"};color:${ok ? "#166534" : "#991b1b"}}
 code{background:#f1f5f9;padding:.15rem .4rem;border-radius:.25rem;font-size:.85em}
 table{border-collapse:collapse;width:100%;margin:.75rem 0}
 td,th{border:1px solid #e2e8f0;padding:.45rem .6rem;text-align:left;font-size:.9rem}
 th{background:#f8fafc}
 .muted{color:#64748b;font-size:.85rem}
</style></head><body>${bodyHtml}</body></html>`,
    { status: ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}

/** Fecha o popup e avisa a janela que o abriu. */
function popupDone(payload: Record<string, unknown>): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><body><script>
      window.opener?.postMessage(${JSON.stringify({ type: "meta-oauth", ...payload })},'*');
      window.close();
    </script><p style="font-family:system-ui">Podes fechar esta janela.</p></body>`,
    { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}

interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const appId = Deno.env.get("FACEBOOK_APP_ID");
  const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
  const configId = Deno.env.get("FACEBOOK_LOGIN_CONFIG_ID");

  // O endereço PÚBLICO, do SUPABASE_URL — não do pedido. Por dentro do proxy o
  // req.url chega como http://<ref>.supabase.co/meta-connect, sem HTTPS e sem o
  // /functions/v1. Derivar daí dava um redirect_uri inexistente, e a Meta
  // respondia "URL bloqueada" a apontar para uma lista que estava correta.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const redirectUri = `${supabaseUrl}/functions/v1/meta-connect`;

  // ── Desautorização ────────────────────────────────────────────────────────
  if (url.searchParams.get("action") === "deauthorize") {
    log("desautorização recebida");
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Arranque manual (sem UI), para testes ─────────────────────────────────
  if (url.searchParams.get("action") === "login") {
    const cfgId = url.searchParams.get("config_id") || configId;
    if (!appId || !cfgId) {
      return page("Falta configuração", `
        <h1>Falta configuração <span class="tag">erro</span></h1>
        <p>É preciso <code>FACEBOOK_APP_ID</code> e o id da configuração do Login
        for Business (<code>FACEBOOK_LOGIN_CONFIG_ID</code>, ou <code>?config_id=</code> no endereço).</p>`, false);
    }
    const dialog = `https://www.facebook.com/v21.0/dialog/oauth`
      + `?client_id=${encodeURIComponent(appId)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&config_id=${encodeURIComponent(cfgId)}`
      + `&response_type=code`;
    return Response.redirect(dialog, 302);
  }

  // ── POST: devolver o URL do diálogo (chamado pelo CRM) ────────────────────
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const orgId = String(body.organization_id ?? "");

    // Desligar: avisa a Meta para parar de enviar webhooks desta Página. Sem
    // isto ela continua a entregar mensagens de uma caixa que já não existe, e
    // o webhook regista-as como "página que não temos ligada" para sempre.
    // A linha em si é apagada pelo CRM (RLS da organização) — aqui é só a
    // subscrição.
    if (body.action === "disconnect") {
      const channelId = String(body.channel_id ?? "");
      if (!orgId || !channelId) {
        return new Response(JSON.stringify({ error: "organization_id ou channel_id em falta" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const admin = createClient(supabaseUrl!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: ch } = await admin.from("messaging_channels")
        .select("metadata").eq("id", channelId).eq("organization_id", orgId).maybeSingle();
      const meta = (ch?.metadata ?? {}) as { page_id?: string; page_access_token?: string };

      if (meta.page_id && meta.page_access_token) {
        try {
          await fetch(
            `${GRAPH}/${meta.page_id}/subscribed_apps?access_token=${encodeURIComponent(meta.page_access_token)}`,
            { method: "DELETE" },
          );
          log("subscrição removida", { pageId: meta.page_id });
        } catch (e) {
          // Melhor esforço: a caixa vai ser apagada de qualquer forma.
          logError("falha a remover a subscrição", { error: (e as Error).message });
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const connect = body.connect === "messenger" ? "messenger" : "instagram";
    const label = String(body.label ?? "").trim();

    if (!appId || !appSecret || !configId) {
      return new Response(JSON.stringify({
        error: "Faltam FACEBOOK_APP_ID, FACEBOOK_APP_SECRET ou FACEBOOK_LOGIN_CONFIG_ID",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!orgId) {
      return new Response(JSON.stringify({ error: "organization_id em falta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = await signState({ orgId, connect, label, t: String(Date.now()) }, appSecret);
    const dialog = `https://www.facebook.com/v21.0/dialog/oauth`
      + `?client_id=${encodeURIComponent(appId)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&config_id=${encodeURIComponent(configId)}`
      + `&state=${encodeURIComponent(state)}`
      + `&response_type=code`;
    return new Response(JSON.stringify({ url: dialog }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── GET: callback do OAuth ────────────────────────────────────────────────
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (oauthError) {
    const msg = oauthError.replace(/[<>]/g, "");
    return stateRaw
      ? popupDone({ error: msg })
      : page("Ligação recusada", `<h1>Ligação recusada <span class="tag">erro</span></h1><p><code>${msg}</code></p>`, false);
  }

  if (!code) {
    return page("meta-connect", `
      <h1>meta-connect <span class="tag">ativo</span></h1>
      <p>Endereço de redirecionamento do Facebook Login for Business.</p>
      <p class="muted">Registado no painel da Meta como:<br><code>${redirectUri}</code></p>`);
  }

  if (!appId || !appSecret) {
    return page("Configuração em falta", `
      <h1>Configuração em falta <span class="tag">erro</span></h1>
      <p>Faltam <code>FACEBOOK_APP_ID</code> / <code>FACEBOOK_APP_SECRET</code>.</p>`, false);
  }

  try {
    // 1. Código → token de utilizador
    const tokenRes = await fetch(`${GRAPH}/oauth/access_token`
      + `?client_id=${encodeURIComponent(appId)}`
      + `&client_secret=${encodeURIComponent(appSecret)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&code=${encodeURIComponent(code)}`);
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      logError("troca de código falhou", tokenJson);
      const msg = "Falha ao trocar o código pelo token";
      return stateRaw ? popupDone({ error: msg }) : page("Erro", `
        <h1>${msg} <span class="tag">erro</span></h1>
        <pre><code>${JSON.stringify(tokenJson, null, 2).replace(/[<>]/g, "")}</code></pre>`, false);
    }
    const userToken = String(tokenJson.access_token);

    // 2. Páginas + Instagram ligado a cada uma
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100`,
      { headers: { Authorization: `Bearer ${userToken}` } },
    );
    const pagesJson = await pagesRes.json();
    const pages: MetaPage[] = pagesJson.data ?? [];

    // ── Sem state: modo diagnóstico (arranque manual) ──────────────────────
    if (!stateRaw) {
      const permsRes = await fetch(`${GRAPH}/me/permissions?access_token=${encodeURIComponent(userToken)}`);
      const perms = await permsRes.json();
      const granted = (perms.data ?? []).filter((p: { status: string }) => p.status === "granted")
        .map((p: { permission: string }) => p.permission);
      const rows = pages.map((p) => `<tr><td>${p.name}</td><td><code>${p.id}</code></td><td>${
        p.instagram_business_account
          ? `@${p.instagram_business_account.username} <code>${p.instagram_business_account.id}</code>`
          : '<span class="muted">sem Instagram ligado</span>'
      }</td></tr>`).join("");
      return page("Ligação bem-sucedida", `
        <h1>Ligação bem-sucedida <span class="tag">ok</span></h1>
        <p>O fluxo funcionou de ponta a ponta. Nada foi guardado — este arranque
        manual serve só para diagnóstico.</p>
        <h2 style="font-size:1rem;margin-top:1.5rem">Permissões concedidas</h2>
        <p>${granted.map((g: string) => `<code>${g}</code>`).join(" ") || '<span class="muted">nenhuma</span>'}</p>
        <h2 style="font-size:1rem;margin-top:1.5rem">Páginas</h2>
        ${rows ? `<table><tr><th>Página</th><th>ID</th><th>Instagram</th></tr>${rows}</table>`
               : '<p class="muted">Nenhuma Página acessível.</p>'}`);
    }

    // ── Com state: ligar mesmo ────────────────────────────────────────────
    const state = await readState(stateRaw, appSecret);
    if (!state?.orgId) {
      logError("state inválido ou adulterado");
      return popupDone({ error: "Pedido inválido — recomeça a ligação a partir do CRM." });
    }
    const { orgId, connect } = state;
    const wantsInstagram = connect !== "messenger";

    // A Página tem de ter Instagram ligado quando é isso que se quer.
    const candidates = wantsInstagram ? pages.filter((p) => p.instagram_business_account) : pages;
    if (candidates.length === 0) {
      const nomes = pages.map((p) => p.name).join(", ") || "nenhuma";
      return popupDone({
        error: wantsInstagram
          ? `Nenhuma das tuas Páginas (${nomes}) tem uma conta de Instagram Business ligada. Liga-a em facebook.com → Página → Definições → Instagram.`
          : "Não foi encontrada nenhuma Página do Facebook na tua conta.",
      });
    }
    // Uma Página escolhe-se sozinha; com várias, a primeira — e o CRM permite
    // repetir para ligar as outras (cada uma vira uma caixa própria).
    const target = candidates[0];

    const admin = createClient(supabaseUrl!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Já ligada? Evita duplicar a caixa para a mesma Página.
    const channelType = wantsInstagram ? "instagram" : "facebook";
    const { data: existing } = await admin.from("messaging_channels")
      .select("id").eq("organization_id", orgId).eq("channel_type", channelType)
      .eq("metadata->>page_id", target.id).maybeSingle();
    if (existing) {
      return popupDone({ error: `Esta Página já está ligada como caixa de ${wantsInstagram ? "Instagram" : "Messenger"}.` });
    }

    const defaultLabel = wantsInstagram
      ? `@${target.instagram_business_account!.username}`
      : target.name;
    const label = (state.label || defaultLabel).trim();

    // Subscrever a Página aos nossos webhooks. SEM ISTO a Meta não envia
    // mensagem nenhuma — a ligação fica feita e a caixa aparece vazia para
    // sempre, sem erro nenhum a explicar porquê.
    const subFields = wantsInstagram
      ? "messages,messaging_postbacks,message_reactions"
      : "messages,messaging_postbacks,messaging_optins";
    const subRes = await fetch(`${GRAPH}/${target.id}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscribed_fields: subFields, access_token: target.access_token }),
    });
    const subJson = await subRes.json().catch(() => ({}));
    if (!subRes.ok || subJson?.success === false) {
      logError("subscrição da Página falhou", { status: subRes.status, subJson });
      return popupDone({
        error: `A Página foi autorizada mas não conseguimos subscrever as mensagens: ${
          subJson?.error?.message ?? subRes.status
        }`,
      });
    }

    const { error: insertErr } = await admin.from("messaging_channels").insert({
      organization_id: orgId,
      channel_type: channelType,
      provider: "meta",
      status: "connected",
      label,
      metadata: {
        page_id: target.id,
        page_name: target.name,
        // Token da Página: é com ele que se responde. Sem expiração, desde que
        // a pessoa não retire a autorização à app.
        page_access_token: target.access_token,
        ig_account_id: target.instagram_business_account?.id ?? null,
        ig_username: target.instagram_business_account?.username ?? null,
        subscribed_fields: subFields,
      },
    });

    if (insertErr) {
      logError("insert falhou", { error: insertErr.message });
      return popupDone({ error: "Erro ao guardar a caixa na base de dados." });
    }

    log("caixa criada", { orgId, channelType, page: target.name });
    return popupDone({
      success: true,
      channel_type: channelType,
      label,
      ig_username: target.instagram_business_account?.username ?? null,
      page_name: target.name,
      remaining: candidates.length - 1,
    });
  } catch (e) {
    logError("erro inesperado", { error: (e as Error).message });
    return stateRaw
      ? popupDone({ error: (e as Error).message })
      : page("Erro", `<h1>Erro <span class="tag">erro</span></h1><p><code>${(e as Error).message.replace(/[<>]/g, "")}</code></p>`, false);
  }
});
