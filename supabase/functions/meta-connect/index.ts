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

/** Um `state` só vale 15 minutos: é o tempo de fazer o login, não mais. */
const STATE_TTL_MS = 15 * 60 * 1000;

async function readState(state: string, secret: string): Promise<Record<string, string> | null> {
  const [payload, sig] = state.split(".", 2);
  if (!payload || !sig) return null;
  if (await hmac(payload, secret) !== sig) return null;
  let data: Record<string, string>;
  try { data = JSON.parse(atob(payload)); } catch { return null; }
  // Sem prazo, um `state` capturado uma vez servia para sempre.
  const t = Number(data.t ?? 0);
  if (!t || Date.now() - t > STATE_TTL_MS) return null;
  return data;
}

/**
 * Quem está a chamar, e pertence mesmo a esta organização?
 *
 * Esta função corre com `verify_jwt = false` — tem de ser, o callback do OAuth
 * chega pelo browser sem sessão. Mas o POST vem do CRM e TEM de ser verificado
 * aqui dentro: sem isto, um pedido sem autenticação nenhuma devolvia um link de
 * OAuth assinado para qualquer organização, e bastava fazer a vítima clicar nele
 * para lhe injetar uma caixa na conta.
 */
async function membroDaOrg(
  req: Request,
  orgId: string,
  admin: ReturnType<typeof createClient>,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return { ok: false, status: 401, error: "Não autorizado" };

  const { data: { user } } = await admin.auth.getUser(bearer);
  if (!user) return { ok: false, status: 401, error: "Sessão inválida" };

  // O parâmetro chama-se `_org_id` — com o nome errado o Postgres não encontra a
  // função e toda a gente levava um 403 a mentir sobre a causa.
  const { data: isMember, error } = await admin.rpc("is_org_member", {
    _user_id: user.id, _org_id: orgId,
  });
  if (error) {
    logError("verificação de membro falhou", { error: error.message });
    return { ok: false, status: 500, error: "Não foi possível verificar o acesso" };
  }
  if (!isMember) return { ok: false, status: 403, error: "Sem acesso a esta organização" };
  return { ok: true };
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

/**
 * Só se aceita voltar para um endereço com ar de origem, e nada mais: sem
 * caminho, sem query. O valor vem assinado dentro do `state`, mas uma validação
 * a mais custa uma linha e fecha a porta a um redirecionamento inventado.
 */
function origemValida(origem: string | undefined): string | null {
  if (!origem) return null;
  try {
    const u = new URL(origem);
    if (u.protocol !== "https:" && u.hostname !== "localhost") return null;
    return u.origin;
  } catch { return null; }
}

/**
 * Fecha o popup e avisa a janela que o abriu.
 *
 * Não devolve HTML: a Supabase serve TUDO como `text/plain` com
 * `X-Content-Type-Options: nosniff`, ignorando o Content-Type que aqui se
 * definisse. O browser mostrava o código-fonte ao utilizador e a janela ficava
 * aberta para ele fechar à mão.
 *
 * Por isso manda-se o popup de volta ao domínio do CRM, onde o HTML é HTML e a
 * página `/oauth/meta` faz o postMessage e o `window.close()`. O resultado vai
 * no fragmento (`#`), que não chega ao servidor nem aos registos de acesso.
 */
function popupDone(payload: Record<string, unknown>, origem?: string | null): Response {
  const destino = origemValida(origem ?? undefined);
  const dados = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

  if (destino) {
    return Response.redirect(`${destino}/oauth/meta#${dados}`, 302);
  }

  // Sem origem de confiança (ligação antiga, ou arranque manual): já não se
  // tenta correr script nenhum — em text/plain nunca correria. Uma frase que se
  // lê é melhor do que código à vista.
  return new Response(
    payload.error
      ? `Não foi possível ligar: ${payload.error}\n\nFecha esta janela e tenta outra vez no CRM.`
      : "Ligação concluída. Já podes fechar esta janela e voltar ao CRM.",
    { headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } },
  );
}

interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username: string };
}

/**
 * Liga uma conta de WhatsApp Business (Cloud API oficial).
 *
 * Não passa por Páginas do Facebook: o que se procura é a WABA — a conta de
 * WhatsApp Business — e os números dela. Três passos que TÊM de acontecer todos,
 * e cada um falha de maneira diferente:
 *
 *  1. Descobrir a WABA que o cliente acabou de autorizar.
 *  2. Subscrever a nossa app aos webhooks dessa WABA. Sem isto a ligação fica
 *     feita e não chega mensagem nenhuma — o mesmo erro silencioso que o
 *     Instagram teve.
 *  3. Registar o número na Cloud API. Com Coexistence o número continua na app
 *     do cliente; sem este passo, não se consegue enviar.
 *
 * O token que se guarda é o do UTILIZADOR, não o de uma Página: no WhatsApp é
 * ele que autoriza o envio em nome da conta.
 */
async function ligarWhatsApp(p: {
  // deno-lint-ignore no-explicit-any
  admin: any;
  userToken: string;
  orgId: string;
  label?: string;
  appId: string;
  appSecret: string;
  origem: string | null;
  supabaseUrl: string;
}): Promise<Response> {
  const { admin, userToken, orgId, origem } = p;

  // TODAS as contas a que esta autorização dá acesso, não a primeira.
  //
  // Isto ligava `data[0]` às cegas. Numa agência — que tem acesso ao Business
  // Manager dos clientes — a primeira que a Meta devolve pode ser a de um
  // CLIENTE. Foi o que aconteceu: ligou-se a conta da Delta Capital à caixa da
  // Senvia, sem nada para escolher.
  const wabas: Array<{ id: string; nome: string | null }> = [];
  const porque: string[] = [];

  // 1. O caminho documentado: perguntar ao `debug_token` que contas é que esta
  //    autorização abrange.
  //
  //    ATENÇÃO ao `access_token` deste pedido: tem de ser o token da APP
  //    (`app-id|app-secret`), NÃO o do utilizador. Com o do utilizador a Meta
  //    responde 200 com os campos em branco — sem `granular_scopes` — e ficava
  //    a parecer que a conta não existia. Foi o que aconteceu à primeira.
  try {
    const appToken = `${p.appId}|${p.appSecret}`;
    const debug = await fetch(
      `${GRAPH}/debug_token?input_token=${encodeURIComponent(userToken)}`
      + `&access_token=${encodeURIComponent(appToken)}`,
    ).then((r) => r.json());

    const escopos = debug?.data?.granular_scopes ?? [];
    for (const nome of ["whatsapp_business_management", "whatsapp_business_messaging"]) {
      const alvo = escopos.find((g: { scope?: string }) => g.scope === nome);
      for (const id of alvo?.target_ids ?? []) {
        if (!wabas.some((w) => w.id === String(id))) wabas.push({ id: String(id), nome: null });
      }
    }
    if (wabas.length === 0) {
      porque.push(`autorização sem conta associada (${
        escopos.map((g: { scope?: string }) => g.scope).join(", ") || "sem permissões"})`);
    }
  } catch (e) {
    porque.push(`debug_token: ${(e as Error).message}`);
  }

  // 2. Pelos negócios do utilizador — apanha as contas próprias E as que lhe
  //    foram partilhadas por um cliente. Junta-se tudo; a escolha é dele.
  try {
    const res = await fetch(
      `${GRAPH}/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name},`
      + `client_whatsapp_business_accounts{id,name}`
      + `&access_token=${encodeURIComponent(userToken)}`,
    );
    const json = await res.json();
    if (json?.error) porque.push(`negócios: ${json.error.message}`);
    for (const neg of json?.data ?? []) {
      const contas = [
        ...(neg?.owned_whatsapp_business_accounts?.data ?? []),
        ...(neg?.client_whatsapp_business_accounts?.data ?? []),
      ];
      for (const c of contas) {
        if (!c?.id) continue;
        const ja = wabas.find((w) => w.id === String(c.id));
        if (ja) ja.nome = ja.nome ?? (c.name ?? neg.name ?? null);
        else wabas.push({ id: String(c.id), nome: c.name ?? neg.name ?? null });
      }
    }
  } catch (e) {
    porque.push(`negócios: ${(e as Error).message}`);
  }

  if (wabas.length === 0) {
    logError("nenhuma WABA encontrada", { porque });
    return popupDone({
      // O motivo vai na mensagem: sem ele, "não encontrámos nada" manda a
      // pessoa repetir o assistente às cegas.
      error: "Não encontrámos nenhuma conta de WhatsApp Business nesta autorização. "
        + (porque.length ? `Motivo: ${porque.join(" | ")}. ` : "")
        + "Confirma que escolheste (ou criaste) uma conta de WhatsApp Business no assistente da Meta.",
    }, origem);
  }

  // Os números de TODAS as contas, cada um com a conta a que pertence — é o que
  // permite mostrar "Delta Capital · +351 96588…" e não um número solto.
  const numeros: Array<Record<string, unknown>> = [];
  for (const w of wabas) {
    try {
      const r = await fetch(
        `${GRAPH}/${w.id}/phone_numbers`
        + `?fields=id,display_phone_number,verified_name,quality_rating`
        + `&access_token=${encodeURIComponent(userToken)}`,
      );
      const j = await r.json();
      for (const n of j?.data ?? []) {
        if (!n?.id) continue;
        numeros.push({
          phone_number_id: String(n.id),
          waba_id: w.id,
          waba_name: w.nome,
          display_phone_number: n.display_phone_number ?? null,
          verified_name: n.verified_name ?? null,
          quality_rating: n.quality_rating ?? null,
        });
      }
    } catch (e) {
      porque.push(`números de ${w.id}: ${(e as Error).message}`);
    }
  }

  if (numeros.length === 0) {
    return popupDone({
      error: "A conta de WhatsApp não tem nenhum número associado. "
        + "Adiciona um número no assistente da Meta e tenta outra vez.",
    }, origem);
  }

  // Mais do que um: PERGUNTA-SE. O token fica no servidor e o browser leva só um
  // identificador — nunca a credencial.
  if (numeros.length > 1) {
    const { data: pendente, error: pendErr } = await admin
      .from("meta_pending_connections")
      .insert({
        organization_id: orgId,
        connect: "whatsapp",
        label: p.label ?? null,
        user_token: userToken,
        options: numeros,
      }).select("id").single();

    if (pendErr || !pendente) {
      logError("não foi possível guardar a escolha", { error: pendErr?.message });
      return popupDone({ error: "Erro ao preparar a escolha da conta." }, origem);
    }

    return popupDone({
      needs_choice: true,
      connect: "whatsapp",
      pending_id: pendente.id,
      options: numeros,
    }, origem);
  }

  return await criarCaixaWhatsApp({
    admin, userToken, orgId, label: p.label, origem, numero: numeros[0],
  });
}

/** Cria a caixa para um número já escolhido. */
// deno-lint-ignore no-explicit-any
async function criarCaixaWhatsApp(p: any): Promise<Response> {
  const { admin, userToken, orgId, origem } = p;
  const numero = p.numero as Record<string, string>;
  const wabaId = numero.waba_id;

  // Esta função serve dois chamadores: o callback do OAuth (que responde ao
  // POPUP, com redirecionamento) e a escolha feita no CRM (que responde ao
  // FETCH, com JSON). Mesma lógica, duas formas de responder.
  const responder = (payload: Record<string, unknown>, status = 200) =>
    p.comoJson
      ? new Response(JSON.stringify(payload), {
        status: payload.error ? (status === 200 ? 400 : status) : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
      : popupDone(payload, origem);

  // Já ligado noutra organização? O webhook resolve por phone_number_id e
  // devolve UMA linha — partilhar o número entre contas era entregar as
  // mensagens de uma à outra.
  const { data: noutra } = await admin.from("messaging_channels")
    .select("id, organization_id")
    .eq("metadata->>phone_number_id", String(numero.phone_number_id))
    .maybeSingle();
  if (noutra && noutra.organization_id !== orgId) {
    return responder({
      error: "Este número já está ligado noutra conta do Senvia OS.",
    });
  }

  // 3. Subscrever a WABA aos nossos webhooks. SEM ISTO não chega mensagem
  // nenhuma, e a caixa fica para sempre vazia sem erro que o explique.
  const subRes = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: userToken }),
  });
  const subJson = await subRes.json().catch(() => ({}));
  if (!subRes.ok || subJson?.success === false) {
    logError("subscrição da WABA falhou", { status: subRes.status, subJson });
    return responder({
      error: `A conta foi autorizada mas não conseguimos subscrever as mensagens: ${
        subJson?.error?.message ?? subRes.status}`,
    });
  }

  // 4. Registar o número na Cloud API. Com Coexistence pode já vir registado —
  // nesse caso a Meta responde erro e ignora-se, porque o fim já está cumprido.
  try {
    const reg = await fetch(`${GRAPH}/${numero.phone_number_id}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", pin: "000000", access_token: userToken }),
    });
    const regJson = await reg.json().catch(() => ({}));
    if (!reg.ok) log("registo do número não necessário ou recusado", { erro: regJson?.error?.message });
  } catch (e) {
    log("registo do número falhou", { error: (e as Error).message });
  }

  const etiqueta = (p.label || numero.verified_name || numero.display_phone_number || "WhatsApp").trim();

  const { data: canal, error: insErr } = await admin.from("messaging_channels").upsert({
    organization_id: orgId,
    channel_type: "whatsapp",
    // 'meta' distingue-o das caixas antigas do Evolution, que ficam intactas.
    provider: "meta",
    status: "connected",
    label: etiqueta,
    phone_number: String(numero.display_phone_number ?? "").replace(/\D/g, "") || null,
    metadata: {
      phone_number_id: String(numero.phone_number_id),
      waba_id: wabaId,
      waba_name: numero.waba_name ?? null,
      display_phone_number: numero.display_phone_number ?? null,
      verified_name: numero.verified_name ?? null,
      quality_rating: numero.quality_rating ?? null,
    },
  }).select("id").single();

  if (insErr || !canal) {
    logError("insert do canal WhatsApp falhou", { error: insErr?.message });
    return responder({ error: "Erro ao guardar a caixa na base de dados." });
  }

  const { error: segErr } = await admin.from("messaging_channel_secrets").upsert({
    channel_id: canal.id,
    organization_id: orgId,
    page_access_token: userToken,
  }, { onConflict: "channel_id" });

  if (segErr) {
    logError("token do WhatsApp não guardado", { error: segErr.message });
    await admin.from("messaging_channels").delete().eq("id", canal.id);
    return responder({ error: "Erro ao guardar as credenciais. Tenta novamente." });
  }

  log("caixa de WhatsApp criada", { orgId, numero: numero.display_phone_number });
  return responder({
    success: true,
    channel_type: "whatsapp",
    label: etiqueta,
    page_name: numero.display_phone_number ?? null,
  });
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
    const jsonRes = (b: unknown, status = 200) =>
      new Response(JSON.stringify(b), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (!orgId) return jsonRes({ error: "organization_id em falta" }, 400);

    const admin = createClient(supabaseUrl!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const acesso = await membroDaOrg(req, orgId, admin);
    if (!acesso.ok) return jsonRes({ error: acesso.error }, acesso.status);

    // Desligar: avisa a Meta para parar de enviar webhooks desta Página. Sem
    // isto ela continua a entregar mensagens de uma caixa que já não existe, e
    // o webhook regista-as como "página que não temos ligada" para sempre.
    // A linha em si é apagada pelo CRM (RLS da organização) — aqui é só a
    // subscrição.
    // Concluir uma ligação que ficou à espera de escolha. O token está guardado
    // no servidor; daqui só vem o identificador da escolha e o número escolhido.
    if (body.action === "finish_choice") {
      const pendingId = String(body.pending_id ?? "");
      const escolhido = String(body.phone_number_id ?? "");
      if (!pendingId || !escolhido) {
        return jsonRes({ error: "pending_id ou phone_number_id em falta" }, 400);
      }

      const { data: pend } = await admin
        .from("meta_pending_connections")
        .select("id, organization_id, user_token, options, label, expires_at")
        .eq("id", pendingId)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (!pend) return jsonRes({ error: "Escolha não encontrada. Recomeça a ligação." }, 404);
      if (new Date(pend.expires_at) < new Date()) {
        await admin.from("meta_pending_connections").delete().eq("id", pend.id);
        return jsonRes({ error: "A escolha expirou. Recomeça a ligação." }, 410);
      }

      // O número TEM de vir da lista que nós guardámos. Aceitar um número
      // qualquer daqui deixava ligar uma conta que a autorização não cobre.
      const numero = (pend.options as Array<Record<string, unknown>>)
        .find((o) => String(o.phone_number_id) === escolhido);
      if (!numero) return jsonRes({ error: "Esse número não faz parte desta autorização." }, 400);

      const r = await criarCaixaWhatsApp({
        admin, userToken: pend.user_token, orgId,
        label: pend.label, origem: null, numero, comoJson: true,
      });

      // Concluída ou falhada, a linha sai: é um token guardado a menos.
      await admin.from("meta_pending_connections").delete().eq("id", pend.id);
      return r;
    }

    if (body.action === "disconnect") {
      const channelId = String(body.channel_id ?? "");
      if (!channelId) return jsonRes({ error: "channel_id em falta" }, 400);

      const { data: ch } = await admin.from("messaging_channels")
        .select("metadata, channel_type").eq("id", channelId).eq("organization_id", orgId).maybeSingle();
      const meta = (ch?.metadata ?? {}) as { page_id?: string; waba_id?: string };
      const { data: sec } = await admin.from("messaging_channel_secrets")
        .select("page_access_token").eq("channel_id", channelId).maybeSingle();

      // A subscrição é da PÁGINA (ou, no WhatsApp, da CONTA), não da caixa. A
      // mesma Página pode estar ligada duas vezes — Instagram e Messenger são
      // caixas separadas. Cancelar sem verificar matava a outra em silêncio.
      //
      // O WhatsApp não tem `page_id`: subscreve-se a WABA. Sem este ramo,
      // apagar a caixa deixava a Meta a continuar a mandar-nos as mensagens
      // dessa conta para sempre — sem caixa para as receber.
      const alvoId = meta.page_id ?? meta.waba_id ?? null;
      const campo = meta.page_id ? "page_id" : "waba_id";

      let outrasCaixas = 0;
      if (alvoId) {
        const { count } = await admin.from("messaging_channels")
          .select("id", { count: "exact", head: true })
          .eq(`metadata->>${campo}`, alvoId)
          .neq("id", channelId);
        outrasCaixas = count ?? 0;
      }

      if (alvoId && sec?.page_access_token && outrasCaixas === 0) {
        try {
          await fetch(
            `${GRAPH}/${alvoId}/subscribed_apps?access_token=${encodeURIComponent(sec.page_access_token)}`,
            { method: "DELETE" },
          );
          log("subscrição removida", { [campo]: alvoId });
        } catch (e) {
          // Melhor esforço: a caixa vai ser apagada de qualquer forma.
          logError("falha a remover a subscrição", { error: (e as Error).message });
        }
      } else if (outrasCaixas > 0) {
        log("subscrição mantida — a conta ainda serve outra caixa", { [campo]: alvoId, outrasCaixas });
      }
      return jsonRes({ ok: true });
    }
    // O WhatsApp entra pelo mesmo diálogo, com uma configuração própria no
    // painel da Meta (Embedded Signup) — daí o config_id poder mudar.
    const connect = ["messenger", "whatsapp"].includes(body.connect) ? body.connect : "instagram";
    const label = String(body.label ?? "").trim();

    // O WhatsApp tem configuração PRÓPRIA no painel da Meta (o Embedded Signup
    // é outro fluxo, com outras permissões). Usar a do Instagram aqui abria o
    // diálogo errado e o cliente ligava a coisa errada.
    const configDoCanal = connect === "whatsapp"
      ? (Deno.env.get("WHATSAPP_LOGIN_CONFIG_ID") || "")
      : configId;

    if (!appId || !appSecret || !configDoCanal) {
      return jsonRes({
        error: connect === "whatsapp"
          ? "Falta WHATSAPP_LOGIN_CONFIG_ID — é a configuração de Embedded Signup do WhatsApp, criada no painel da Meta."
          : "Faltam FACEBOOK_APP_ID, FACEBOOK_APP_SECRET ou FACEBOOK_LOGIN_CONFIG_ID",
      }, 500);
    }

    // A origem do CRM viaja DENTRO do state assinado. É para lá que o popup
    // volta no fim — a edge function não consegue servir HTML que corra.
    const origem = origemValida(String(body.origin ?? "")) ?? "";

    const state = await signState(
      { orgId, connect, label, origem, t: String(Date.now()) },
      appSecret,
    );
    const dialog = `https://www.facebook.com/v21.0/dialog/oauth`
      + `?client_id=${encodeURIComponent(appId)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&config_id=${encodeURIComponent(configDoCanal)}`
      + `&state=${encodeURIComponent(state)}`
      + `&response_type=code`
      // Coexistence: deixa o cliente manter o número na app do WhatsApp Business
      // e sincronizar os contactos e o histórico dos últimos 180 dias. Sem isto
      // o número teria de ser apagado da app — que era a razão pela qual isto
      // não se podia vender.
      + (connect === "whatsapp"
        ? `&extras=${encodeURIComponent(JSON.stringify({ featureType: "whatsapp_business_app_onboarding" }))}`
        : "");
    return jsonRes({ url: dialog });
  }

  // ── GET: callback do OAuth ────────────────────────────────────────────────
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  // Lê-se o state já aqui, e não só lá em baixo: é dele que sai a origem para
  // onde o popup volta, e ele é preciso mesmo nos caminhos de erro — senão uma
  // recusa deixava a janela aberta com texto solto, que é a queixa de origem.
  const stateCedo = stateRaw && appSecret ? await readState(stateRaw, appSecret) : null;
  const origemPopup = stateCedo?.origem ?? null;

  if (oauthError) {
    const msg = oauthError.replace(/[<>]/g, "");
    return stateRaw
      ? popupDone({ error: msg }, origemPopup)
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
      return stateRaw ? popupDone({ error: msg }, origemPopup) : page("Erro", `
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
    // Já foi lido e verificado lá em cima — não se assina duas vezes o mesmo.
    const state = stateCedo;
    if (!state?.orgId) {
      logError("state inválido ou adulterado");
      return popupDone({ error: "Pedido inválido — recomeça a ligação a partir do CRM." }, origemPopup);
    }
    const { orgId, connect } = state;
    const admin = createClient(supabaseUrl!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // O WhatsApp não passa por Páginas: o que se procura é a conta de WhatsApp
    // Business (WABA) e os números dela. Caminho próprio.
    if (connect === "whatsapp") {
      return await ligarWhatsApp({
        admin, userToken, orgId, label: state.label,
        appId: appId!, appSecret: appSecret!,
        origem: origemPopup, supabaseUrl: supabaseUrl!,
      });
    }

    const wantsInstagram = connect !== "messenger";
    const channelType = wantsInstagram ? "instagram" : "facebook";

    // A Página tem de ter Instagram ligado quando é isso que se quer.
    const elegiveis = wantsInstagram ? pages.filter((p) => p.instagram_business_account) : pages;
    if (elegiveis.length === 0) {
      const nomes = pages.map((p) => p.name).join(", ") || "nenhuma";
      return popupDone({
        error: pages.length === 0
          // Sem Páginas nenhumas o problema quase nunca é o Instagram: é a app
          // ainda estar em Acesso Padrão, e a Meta devolve uma lista vazia a
          // quem não tem cargo nela. Dizer "liga o Instagram" mandava a pessoa
          // mexer nas definições erradas.
          ? "A Meta não devolveu nenhuma Página para esta conta. Confirma que tens um cargo de administrador numa Página do Facebook e que a autorizaste no ecrã anterior."
          : `Nenhuma das tuas Páginas (${nomes}) tem uma conta de Instagram Business ligada. Liga-a em facebook.com → Página → Definições → Instagram.`,
      }, origemPopup);
    }

    // Já ligadas? Tirar da lista em vez de rejeitar — senão, com várias Páginas,
    // a escolha caía sempre na mesma e as outras nunca chegavam a ser ligáveis.
    const { data: jaLigadas } = await admin.from("messaging_channels")
      .select("metadata").eq("organization_id", orgId).eq("channel_type", channelType);
    const ligadas = new Set(
      (jaLigadas ?? []).map((c) => (c.metadata as { page_id?: string } | null)?.page_id).filter(Boolean),
    );
    const candidates = elegiveis.filter((p) => !ligadas.has(p.id));
    if (candidates.length === 0) {
      return popupDone({
        error: elegiveis.length === 1
          ? `Esta Página já está ligada como caixa de ${wantsInstagram ? "Instagram" : "Messenger"}.`
          : "Todas as tuas Páginas já estão ligadas a caixas desta organização.",
      }, origemPopup);
    }

    // Uma Página escolhe-se sozinha; com várias, a primeira ainda não ligada —
    // e repetir a ligação apanha a seguinte.
    const target = candidates[0];

    // A mesma Página noutra organização entrega as mensagens dela a quem a
    // ligou primeiro: o webhook resolve por page_id e devolve UMA linha. Duas
    // organizações a partilhar a Página é isolamento partido, não um aviso.
    const { data: noutraOrg } = await admin.from("messaging_channels")
      .select("id").eq("channel_type", channelType)
      .eq("metadata->>page_id", target.id).neq("organization_id", orgId).maybeSingle();
    if (noutraOrg) {
      return popupDone({
        error: "Esta Página já está ligada noutra conta do Senvia OS. "
          + "Desliga-a lá primeiro, ou fala connosco para a transferirmos.",
      }, origemPopup);
    }

    const defaultLabel = wantsInstagram
      ? `@${target.instagram_business_account!.username}`
      : target.name;
    const label = (state.label || defaultLabel).trim();

    // Subscrever a Página aos nossos webhooks. SEM ISTO a Meta não envia
    // mensagem nenhuma — a ligação fica feita e a caixa aparece vazia para
    // sempre, sem erro nenhum a explicar porquê.
    //
    // Os campos são SUBSTITUÍDOS, não somados: se a mesma Página já servir a
    // outra caixa, subscrever só os campos desta apagava os dela — as reações
    // do Instagram deixavam de chegar sem erro nenhum. Por isso junta-se ao que
    // lá está.
    //
    // Os nomes NÃO são os mesmos nos dois: o Instagram usa `messaging_seen`
    // para o "visto", o Messenger usa `message_reads`; e o referral é
    // `messaging_referrals` (plural) na Página. Um nome errado faz a subscrição
    // INTEIRA falhar — daí o plano B mais abaixo.
    const meus = wantsInstagram
      ? ["messages", "messaging_postbacks", "message_reactions", "messaging_seen"]
      : [
        "messages",
        "messaging_postbacks",
        "messaging_optins",
        // Faltava: sem isto o Messenger não recebia reação nenhuma.
        "message_reactions",
        "message_reads",
        // De onde veio a conversa (anúncio, m.me?ref=).
        "messaging_referrals",
      ];
    const { data: mesmaPagina } = await admin.from("messaging_channels")
      .select("metadata").eq("metadata->>page_id", target.id);
    const jaSubscritos = (mesmaPagina ?? []).flatMap((c) =>
      String((c.metadata as { subscribed_fields?: string } | null)?.subscribed_fields ?? "")
        .split(",").filter(Boolean)
    );
    const subscrever = async (campos: string) => {
      const res = await fetch(`${GRAPH}/${target.id}/subscribed_apps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed_fields: campos, access_token: target.access_token }),
      });
      const corpo = await res.json().catch(() => ({}));
      return { ok: res.ok && corpo?.success !== false, status: res.status, corpo };
    };

    const desejados = [...new Set([...meus, ...jaSubscritos])].join(",");
    let subFields = desejados;
    let sub = await subscrever(desejados);

    // Plano B: a Meta recusa a lista INTEIRA se um nome não existir para este
    // tipo de conta — e os nomes mudam entre Instagram e Página. Sem isto, um
    // campo secundário mal escrito impedia a ligação por completo. Vale mais
    // ficar sem o "visto" do que sem a caixa.
    if (!sub.ok) {
      const minimos = wantsInstagram
        ? "messages,messaging_postbacks,message_reactions"
        : "messages,messaging_postbacks,message_reactions";
      logError("subscrição completa recusada — a tentar o essencial", {
        desejados, status: sub.status, erro: sub.corpo?.error?.message,
      });
      sub = await subscrever(minimos);
      if (sub.ok) subFields = minimos;
    }

    if (!sub.ok) {
      logError("subscrição da Página falhou", { status: sub.status, subJson: sub.corpo });
      return popupDone({
        error: `A Página foi autorizada mas não conseguimos subscrever as mensagens: ${
          sub.corpo?.error?.message ?? sub.status
        }`,
      }, origemPopup);
    }
    log("Página subscrita", { pageId: target.id, subFields });

    const { data: novoCanal, error: insertErr } = await admin.from("messaging_channels").insert({
      organization_id: orgId,
      channel_type: channelType,
      provider: "meta",
      status: "connected",
      label,
      metadata: {
        page_id: target.id,
        page_name: target.name,
        ig_account_id: target.instagram_business_account?.id ?? null,
        ig_username: target.instagram_business_account?.username ?? null,
        subscribed_fields: subFields,
      },
    }).select("id").single();

    if (insertErr || !novoCanal) {
      logError("insert falhou", { error: insertErr?.message });
      return popupDone({ error: "Erro ao guardar a caixa na base de dados." }, origemPopup);
    }

    // O token da Página vai para uma tabela à parte, com RLS e ZERO políticas:
    // só o service_role lá chega. Em `metadata` ficava legível por qualquer
    // membro da organização — e com ele qualquer pessoa lê e escreve DMs em
    // nome da empresa, para sempre, sem passar pelo CRM.
    const { error: segredoErr } = await admin.from("messaging_channel_secrets").upsert({
      channel_id: novoCanal.id,
      organization_id: orgId,
      page_access_token: target.access_token,
    }, { onConflict: "channel_id" });

    if (segredoErr) {
      // Sem token não se envia nada — mais vale não deixar a caixa meia-feita.
      logError("falha a guardar o token", { error: segredoErr.message });
      await admin.from("messaging_channels").delete().eq("id", novoCanal.id);
      return popupDone({ error: "Erro ao guardar as credenciais da Página. Tenta novamente." }, origemPopup);
    }

    log("caixa criada", { orgId, channelType, page: target.name });
    return popupDone({
      success: true,
      channel_type: channelType,
      label,
      ig_username: target.instagram_business_account?.username ?? null,
      page_name: target.name,
      remaining: candidates.length - 1,
    }, origemPopup);
  } catch (e) {
    logError("erro inesperado", { error: (e as Error).message });
    return stateRaw
      ? popupDone({ error: (e as Error).message }, origemPopup)
      : page("Erro", `<h1>Erro <span class="tag">erro</span></h1><p><code>${(e as Error).message.replace(/[<>]/g, "")}</code></p>`, false);
  }
});
