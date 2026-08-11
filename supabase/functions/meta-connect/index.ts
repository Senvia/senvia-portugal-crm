// meta-connect — callback do Facebook Login for Business (Instagram + Messenger).
//
// Substitui o antigo instagram-connect, que foi feito para o Facebook Login
// NORMAL. A diferença que importa: o Login for Business não recebe a lista de
// permissões no URL (`scope=`) — recebe o id de uma CONFIGURAÇÃO criada no painel
// da Meta (`config_id`). Passar `scope` a esta API faz o diálogo não carregar, com
// uma mensagem de erro que não diz nada sobre a causa.
//
// Âmbito desta versão: PROVAR QUE O FLUXO FECHA. Faz o OAuth de ponta a ponta e
// mostra o que a Meta devolveu — que Páginas e que contas de Instagram, e com que
// permissões. Ainda NÃO liga nada ao Chatwoot nem guarda tokens: enquanto o acesso
// for Padrão, isto só funciona para contas da própria Senvia, e guardar
// credenciais de longa duração antes de haver integração a sério seria criar
// responsabilidade sem benefício.
//
// Três entradas:
//   POST {action:'oauth_url'}      -> devolve o URL do diálogo de login
//   GET  ?code=...                 -> callback do OAuth; mostra o resultado
//   GET|POST ?action=deauthorize   -> callback de desautorização da Meta

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.facebook.com/v21.0";

const log = (s: string, d?: unknown) =>
  console.log(`[META-CONNECT] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const appId = Deno.env.get("FACEBOOK_APP_ID");
  const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
  const configId = Deno.env.get("FACEBOOK_LOGIN_CONFIG_ID");
  const redirectUri = `${url.origin}${url.pathname}`;

  // ── Desautorização ────────────────────────────────────────────────────────
  // A Meta chama isto quando alguém remove a app. Não apaga dados (isso é o
  // meta-data-deletion); serve para sabermos que a ligação deixou de valer.
  if (url.searchParams.get("action") === "deauthorize") {
    log("desautorização recebida");
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Arrancar o login direto do browser ────────────────────────────────────
  // `?action=login` redireciona para o diálogo da Meta. Existe para se poder
  // testar o fluxo inteiro sem interface nenhuma — basta abrir o endereço.
  // O `config_id` pode vir no URL, o que permite testar ANTES de o segredo
  // estar definido (é útil enquanto se anda a experimentar configurações).
  if (url.searchParams.get("action") === "login") {
    const cfg = url.searchParams.get("config_id") || configId;
    if (!appId) {
      return page("Configuração em falta", `
        <h1>Configuração em falta <span class="tag">erro</span></h1>
        <p>Falta <code>FACEBOOK_APP_ID</code> nos segredos do Supabase.</p>`, false);
    }
    if (!cfg) {
      return page("Falta o config_id", `
        <h1>Falta o <code>config_id</code> <span class="tag">erro</span></h1>
        <p>O Facebook Login for Business precisa do id da configuração que criaste
        no painel da Meta, em <em>Login do Facebook para Empresas → Configurações</em>.</p>
        <p>Duas formas de o dar:</p>
        <ul>
          <li>Testar já, pondo-o no endereço:<br>
            <code>${redirectUri}?action=login&amp;config_id=<strong>O_TEU_ID</strong></code></li>
          <li>Definitivo: adicionar o segredo <code>FACEBOOK_LOGIN_CONFIG_ID</code> no Supabase.</li>
        </ul>`, false);
    }
    const dialog = `https://www.facebook.com/v21.0/dialog/oauth`
      + `?client_id=${encodeURIComponent(appId)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&config_id=${encodeURIComponent(cfg)}`
      + `&response_type=code`;
    return Response.redirect(dialog, 302);
  }

  // ── Início do login: devolve o URL do diálogo ─────────────────────────────
  if (req.method === "POST") {
    if (!appId || !configId) {
      return new Response(
        JSON.stringify({ error: "FACEBOOK_APP_ID ou FACEBOOK_LOGIN_CONFIG_ID em falta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // config_id, NÃO scope — é esta a diferença do Login for Business.
    const dialog = `https://www.facebook.com/v21.0/dialog/oauth`
      + `?client_id=${encodeURIComponent(appId)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&config_id=${encodeURIComponent(configId)}`
      + `&response_type=code`;
    return new Response(JSON.stringify({ url: dialog }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Callback do OAuth ─────────────────────────────────────────────────────
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (error) {
    return page("Ligação recusada", `
      <h1>Ligação não concluída <span class="tag">recusada</span></h1>
      <p>A Meta devolveu: <code>${error.replace(/[<>]/g, "")}</code></p>`, false);
  }

  if (!code) {
    // Sem código nem erro: alguém abriu o endereço à mão. Serve de verificação
    // de que está vivo — é o que o validador de URI da Meta precisa.
    return page("meta-connect", `
      <h1>meta-connect <span class="tag">ativo</span></h1>
      <p>Este é o endereço de redirecionamento do Facebook Login for Business.</p>
      <p class="muted">Cola este URL em <em>URIs de redirecionamento do OAuth válidos</em>
      no painel da Meta:<br><code>${redirectUri}</code></p>`);
  }

  if (!appId || !appSecret) {
    return page("Configuração em falta", `
      <h1>Configuração em falta <span class="tag">erro</span></h1>
      <p>Faltam <code>FACEBOOK_APP_ID</code> e/ou <code>FACEBOOK_APP_SECRET</code>
      nos segredos do Supabase.</p>`, false);
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
      log("troca de código falhou", tokenJson);
      return page("Falha na troca do código", `
        <h1>Falha na troca do código <span class="tag">erro</span></h1>
        <pre><code>${JSON.stringify(tokenJson, null, 2).replace(/[<>]/g, "")}</code></pre>
        <p class="muted">O erro mais comum aqui é o <em>redirect_uri</em> não coincidir
        exatamente com o que está na lista da Meta — tem de ser igual, caractere a caractere.</p>`, false);
    }
    const userToken = String(tokenJson.access_token);

    // 2. Que permissões foram mesmo concedidas (nem sempre são as pedidas)
    const permsRes = await fetch(`${GRAPH}/me/permissions?access_token=${encodeURIComponent(userToken)}`);
    const perms = await permsRes.json();
    const granted = (perms.data ?? [])
      .filter((p: { status: string }) => p.status === "granted")
      .map((p: { permission: string }) => p.permission);
    const declined = (perms.data ?? [])
      .filter((p: { status: string }) => p.status !== "granted")
      .map((p: { permission: string }) => p.permission);

    // 3. Páginas e contas de Instagram acessíveis
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=id,name,instagram_business_account{id,username}`
      + `&access_token=${encodeURIComponent(userToken)}`,
    );
    const pages = await pagesRes.json();
    const rows = (pages.data ?? []).map((p: {
      id: string; name: string; instagram_business_account?: { id: string; username: string };
    }) => `<tr><td>${p.name}</td><td><code>${p.id}</code></td><td>${
      p.instagram_business_account
        ? `@${p.instagram_business_account.username} <code>${p.instagram_business_account.id}</code>`
        : '<span class="muted">sem Instagram ligado</span>'
    }</td></tr>`).join("");

    log("login concluído", { paginas: (pages.data ?? []).length, granted });

    return page("Ligação bem-sucedida", `
      <h1>Ligação bem-sucedida <span class="tag">ok</span></h1>
      <p>O fluxo do Facebook Login for Business funcionou de ponta a ponta.</p>

      <h2 style="font-size:1rem;margin-top:1.5rem">Permissões concedidas</h2>
      <p>${granted.length ? granted.map((g: string) => `<code>${g}</code>`).join(" ") : '<span class="muted">nenhuma</span>'}</p>
      ${declined.length ? `<p class="muted">Recusadas: ${declined.map((d: string) => `<code>${d}</code>`).join(" ")}</p>` : ""}

      <h2 style="font-size:1rem;margin-top:1.5rem">Páginas e Instagram</h2>
      ${rows
        ? `<table><tr><th>Página</th><th>ID</th><th>Instagram</th></tr>${rows}</table>`
        : '<p class="muted">Nenhuma Página acessível. Com acesso Padrão só aparecem Páginas que administras.</p>'}

      <p class="muted" style="margin-top:1.5rem">Nada foi guardado — nem tokens, nem ligações.
      Esta página serve para confirmar que a arquitetura fecha antes de se construir a integração.</p>`);
  } catch (e) {
    log("erro inesperado", { error: (e as Error).message });
    return page("Erro", `
      <h1>Erro <span class="tag">erro</span></h1>
      <p><code>${(e as Error).message.replace(/[<>]/g, "")}</code></p>`, false);
  }
});
