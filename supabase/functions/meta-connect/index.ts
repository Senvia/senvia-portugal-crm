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
  const emJson = p.comoJson === true;
  // Quando vem do assistente pelo SDK a resposta e um fetch, nao um popup.
  const resp = (payload: Record<string, unknown>, status = 200) =>
    emJson
      ? new Response(JSON.stringify(payload), {
        status: payload.error ? (status === 200 ? 400 : status) : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
      : popupDone(payload, origem);

  // TODAS as contas a que esta autorização dá acesso, não a primeira.
  //
  // Isto ligava `data[0]` às cegas. Numa agência — que tem acesso ao Business
  // Manager dos clientes — a primeira que a Meta devolve pode ser a de um
  // CLIENTE. Foi o que aconteceu: ligou-se a conta da Delta Capital à caixa da
  // Senvia, sem nada para escolher.
  const wabas: Array<{ id: string; nome: string | null }> = [];
  const porque: string[] = [];
  // Ids de negócio que a autorização abrange. Servem de ponte quando o
  // `/me/businesses` é recusado — ver o passo 3.
  const negocios: string[] = [];

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
    // O que a Meta devolveu mesmo, e não a nossa leitura dela. Sem isto, um
    // "não encontrámos nada" é indistinguível de "não soubemos procurar".
    log("debug_token do WhatsApp", {
      escopos: escopos.map((g: { scope?: string; target_ids?: string[] }) =>
        `${g.scope}=[${(g.target_ids ?? []).join(",")}]`),
      concedidas: debug?.data?.scopes ?? null,
    });

    for (const nome of ["whatsapp_business_management", "whatsapp_business_messaging"]) {
      const alvo = escopos.find((g: { scope?: string }) => g.scope === nome);
      for (const id of alvo?.target_ids ?? []) {
        if (!wabas.some((w) => w.id === String(id))) wabas.push({ id: String(id), nome: null });
      }
    }
    // Os negócios vêm no mesmo sítio. Guardam-se mesmo quando já há contas: são
    // eles que dão os NOMES, e uma lista de ids sem nome não se escolhe.
    for (const nome of ["business_management", "whatsapp_business_management"]) {
      const alvo = escopos.find((g: { scope?: string }) => g.scope === nome);
      for (const id of alvo?.target_ids ?? []) {
        if (!negocios.includes(String(id))) negocios.push(String(id));
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

  // 3. Negócio a negócio, pelos ids que o `debug_token` já nos deu.
  //
  //    O passo 2 pede `/me/businesses`, que precisa de `business_management`
  //    sobre a CONTA toda. Quem autoriza só o WhatsApp não dá isso, e a Meta
  //    responde `(#100) Missing Permission` — que soa a "não tens acesso a
  //    nada" quando na verdade é "não podes LISTAR". Perguntar por um negócio
  //    concreto, cujo id já veio na autorização, é um pedido diferente e passa.
  for (const negId of negocios) {
    if (wabas.some((w) => w.nome)) break;
    for (const edge of ["owned_whatsapp_business_accounts", "client_whatsapp_business_accounts"]) {
      try {
        const res = await fetch(
          `${GRAPH}/${encodeURIComponent(negId)}/${edge}?fields=id,name`
          + `&access_token=${encodeURIComponent(userToken)}`,
        );
        const json = await res.json();
        if (json?.error) { porque.push(`${edge}: ${json.error.message}`); continue; }
        for (const c of json?.data ?? []) {
          if (!c?.id) continue;
          const ja = wabas.find((w) => w.id === String(c.id));
          if (ja) ja.nome = ja.nome ?? (c.name ?? null);
          else wabas.push({ id: String(c.id), nome: c.name ?? null });
        }
      } catch (e) {
        porque.push(`${edge}: ${(e as Error).message}`);
      }
    }
  }

  if (wabas.length === 0) {
    logError("nenhuma WABA encontrada", { porque });

    // Repor o consentimento no estado de primeira autorização.
    //
    // Uma autorização com as permissões concedidas e `target_ids: []` é um
    // consentimento GUARDADO com a lista de contas vazia. Enquanto ele existir,
    // a Meta volta a concedê-lo tal e qual a cada login — e nenhuma quantidade
    // de parâmetros no diálogo o desfaz (o `auth_type=rerequest` foi tentado e
    // não mexeu). Revogar apaga-o, e o login seguinte volta a ser um primeiro
    // login, que é o estado em que isto funcionou.
    //
    // Revogam-se as permissões UMA A UMA, não `DELETE /me/permissions`: essa
    // apagaria a autorização toda, incluindo a que sustenta as caixas de
    // Instagram e Messenger que estão a funcionar. O problema é do WhatsApp;
    // o estrago não tem de ser.
    const limpas: string[] = [];
    for (const perm of [
      "whatsapp_business_management",
      "whatsapp_business_messaging",
      "whatsapp_business_manage_events",
    ]) {
      try {
        const r = await fetch(
          `${GRAPH}/me/permissions/${perm}?access_token=${encodeURIComponent(userToken)}`,
          { method: "DELETE" },
        );
        const j = await r.json().catch(() => ({}));
        limpas.push(`${perm}: ${j?.success === true ? "revogada" : (j?.error?.message ?? r.status)}`);
      } catch (e) {
        limpas.push(`${perm}: ${(e as Error).message}`);
      }
    }
    log("consentimento do WhatsApp revogado para forçar primeira autorização", { limpas });
    return resp({
      // O motivo vai na mensagem: sem ele, "não encontrámos nada" manda a
      // pessoa repetir o assistente às cegas.
      error: "A autorização veio sem nenhuma conta de WhatsApp associada — era um "
        + "consentimento antigo, guardado vazio, que a Meta repetia a cada tentativa. "
        + "Acabei de o apagar. LIGA OUTRA VEZ: agora vai ser tratado como uma "
        + "primeira autorização e deve aparecer-te a lista de contas para escolher. "
        + (porque.length ? `(Detalhe técnico: ${porque.join(" | ")}.)` : ""),
    });
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
    return resp({
      error: "A conta de WhatsApp não tem nenhum número associado. "
        + "Adiciona um número no assistente da Meta e tenta outra vez.",
    });
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
      return resp({ error: "Erro ao preparar a escolha da conta." }, origem);
    }

    return resp({
      needs_choice: true,
      connect: "whatsapp",
      pending_id: pendente.id,
      options: numeros,
    });
  }

  return await criarCaixaWhatsApp({
    admin, userToken, orgId, label: p.label, origem, numero: numeros[0],
    comoJson: emJson,
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

  // 3b. Pedir a sincronização da Coexistence: contactos e histórico.
  //
  // ISTO NÃO ACONTECE SOZINHO. Durante horas assumiu-se que a Meta enviava o
  // histórico por iniciativa dela depois do assistente — não envia. É preciso
  // pedir, e há uma JANELA DE 24 HORAS a contar da ligação; passada, a única
  // saída é desligar o número e refazer tudo.
  //
  // Falhar aqui não invalida a caixa: as mensagens novas continuam a chegar
  // pelo webhook. Por isso regista-se e segue-se, em vez de abortar.
  for (const tipo of ["smb_app_state_sync", "history"]) {
    try {
      const r = await fetch(
        `${GRAPH}/${numero.phone_number_id}/smb_app_data`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // `messaging_product` é obrigatório e a Meta só o diz depois de
          // recusar: "missing : 'messaging_product'". Não vem na documentação
          // do endpoint.
          body: JSON.stringify({
            messaging_product: "whatsapp",
            sync_type: tipo,
            access_token: userToken,
          }),
        },
      );
      const j = await r.json().catch(() => ({}));
      log(`sincronização da Coexistence pedida (${tipo})`, {
        estado: r.status,
        ok: j?.success ?? null,
        erro: j?.error?.message ?? null,
      });
    } catch (e) {
      logError(`sincronização da Coexistence (${tipo})`, { erro: (e as Error).message });
    }
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

  const campos = {
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
  };

  // Repetir a ligação do MESMO número tem de atualizar a caixa, não criar
  // outra. Isto acontece a sério: a ativação da Coexistence só fica completa
  // depois do passo no telemóvel, e até lá a pessoa liga várias vezes. Sem
  // isto ficava com uma caixa por tentativa e teria de apagar — e apagar aqui
  // é definitivo, leva as conversas atrás.
  const { data: jaExiste } = await admin.from("messaging_channels")
    .select("id")
    .eq("organization_id", orgId)
    .eq("channel_type", "whatsapp")
    .eq("metadata->>phone_number_id", String(numero.phone_number_id))
    .maybeSingle();

  const { data: canal, error: insErr } = jaExiste
    ? await admin.from("messaging_channels")
      .update(campos).eq("id", jaExiste.id).select("id").single()
    : await admin.from("messaging_channels")
      .insert(campos).select("id").single();

  if (jaExiste) log("caixa de WhatsApp já existia — atualizada", { canal: jaExiste.id });

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
    // Só se apaga o que se acabou de criar. Se a caixa já existia, ela fica —
    // apagá-la levaria as conversas antigas atrás por causa de uma falha a
    // gravar um token.
    if (!jaExiste) await admin.from("messaging_channels").delete().eq("id", canal.id);
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

  // ── Autoexame: o que a configuração do WhatsApp declara ───────────────────
  //
  // Existe para responder a uma pergunta sem obrigar ninguém a testar às
  // cegas: a configuração do Login for Business declara ativos de WhatsApp?
  // Se não declarar, o diálogo concede as permissões mas NUNCA mostra a lista
  // de contas — e é isso que dá `target_ids: []`, por muito que se force a
  // re-seleção.
  //
  // Nada sai na resposta: o resultado vai só para o registo. Assim isto pode
  // ser chamado por qualquer pessoa sem expor a configuração nem os segredos.
  if (url.searchParams.get("action") === "autoexame") {
    const cfgWa = Deno.env.get("WHATSAPP_LOGIN_CONFIG_ID") || "";
    const appToken = `${appId}|${appSecret}`;
    const ver = async (nome: string, endereco: string) => {
      try {
        const r = await fetch(endereco);
        const t = await r.text();
        log(`autoexame: ${nome}`, { estado: r.status, corpo: t.slice(0, 700) });
      } catch (e) {
        logError(`autoexame: ${nome}`, { erro: (e as Error).message });
      }
    };

    log("autoexame começou", {
      temAppId: !!appId,
      temAppSecret: !!appSecret,
      temConfigWhatsApp: !!cfgWa,
      temConfigGeral: !!configId,
      configWhatsAppIgualAoGeral: !!cfgWa && cfgWa === configId,
    });

    if (cfgWa && appId && appSecret) {
      await ver(
        "configuração do WhatsApp (campos por omissão)",
        `${GRAPH}/${encodeURIComponent(cfgWa)}?access_token=${encodeURIComponent(appToken)}`,
      );
      // Os nomes dos campos não estão documentados de forma estável; pedem-se
      // os plausíveis e fica-se com os que a Meta aceitar.
      await ver(
        "configuração do WhatsApp (campos explícitos)",
        `${GRAPH}/${encodeURIComponent(cfgWa)}`
        + `?fields=id,name,config_type,login_variation,permissions,asset_types,business_asset_types`
        + `&access_token=${encodeURIComponent(appToken)}`,
      );
      // A lista de configurações da app: diz quantas há e de que tipo, o que
      // por si só revela se estamos a usar a errada.
      await ver(
        "configurações da app",
        `${GRAPH}/${encodeURIComponent(appId)}?fields=id,name,config_ids`
        + `&access_token=${encodeURIComponent(appToken)}`,
      );
      // Os campos de webhook que a app subscreve. É aqui que se vê se o
      // `history` está lá — sem ele a Meta NUNCA envia o histórico da
      // Coexistence, e a caixa fica ligada mas vazia, sem erro nenhum.
      try {
        const r = await fetch(
          `${GRAPH}/${encodeURIComponent(appId)}/subscriptions`
          + `?access_token=${encodeURIComponent(appToken)}`,
        );
        const j = await r.json();
        const wa = (j?.data ?? []).find((o: { object?: string }) =>
          o.object === "whatsapp_business_account");
        const campos = (wa?.fields ?? []).map((f: { name?: string }) => f.name);
        log("campos de webhook do WhatsApp", {
          subscrito: !!wa,
          activo: wa?.active ?? null,
          campos,
          // Os três que a Coexistence exige. Sem eles a caixa liga e fica
          // vazia, sem erro nenhum que o explique.
          temHistory: campos.includes("history"),
          temEchoes: campos.includes("smb_message_echoes"),
          temAppState: campos.includes("smb_app_state_sync"),
          temMessages: campos.includes("messages"),
        });
      } catch (e) {
        logError("campos de webhook do WhatsApp", { erro: (e as Error).message });
      }
      // O próprio diálogo, sem seguir redirecionamentos: se a Meta recusar os
      // parâmetros (incluindo `auth_type=rerequest` junto de `config_id`),
      // responde com uma página de erro em vez de mandar para o login.
      const dialogo = `https://www.facebook.com/v21.0/dialog/oauth`
        + `?client_id=${encodeURIComponent(appId)}`
        + `&redirect_uri=${encodeURIComponent(redirectUri)}`
        + `&config_id=${encodeURIComponent(cfgWa)}`
        + `&state=exame`
        + `&auth_type=rerequest`
        + `&response_type=code`;
      try {
        const r = await fetch(dialogo, { redirect: "manual" });
        const t = await r.text();
        const erro = /Não é possível carregar|Cannot Load|error|Erro/i.test(t)
          ? t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500)
          : null;
        log("autoexame: diálogo com auth_type=rerequest", {
          estado: r.status,
          para: r.headers.get("location")?.slice(0, 200) ?? null,
          possivelErro: erro,
        });
      } catch (e) {
        logError("autoexame: diálogo", { erro: (e as Error).message });
      }
    }

    // Exame de UMA caixa já ligada, com o token dela: diz se a Meta considera
    // o número operacional e se a nossa app está mesmo subscrita à WABA. Sem
    // isto, "não chega mensagem" é indistinguível de "chega e perde-se".
    const canalId = url.searchParams.get("canal");
    const saida: Array<Record<string, unknown>> = [];
    if (canalId) {
      const admin = createClient(supabaseUrl!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: canal } = await admin.from("messaging_channels")
        .select("id, metadata_public").eq("id", canalId).maybeSingle();
      const { data: seg } = await admin.from("messaging_channel_secrets")
        .select("page_access_token").eq("channel_id", canalId).maybeSingle();
      const meta = (canal?.metadata_public ?? {}) as Record<string, string>;
      if (seg?.page_access_token && meta.phone_number_id) {
        await ver(
          "estado do número",
          `${GRAPH}/${encodeURIComponent(meta.phone_number_id)}`
          + `?fields=id,display_phone_number,verified_name,status,name_status,`
          + `quality_rating,platform_type,code_verification_status,`
          // `is_on_biz_app` é o campo que diz se o número está mesmo emparelhado
          // com a app do telemóvel. É ELE que separa "ligado" de "a espelhar".
          + `is_on_biz_app,is_official_business_account`
          + `&access_token=${encodeURIComponent(seg.page_access_token)}`,
        );

        // Voltar a pedir a sincronização de uma caixa já ligada. Serve para
        // caixas criadas antes de este pedido existir, e vale enquanto a
        // janela de 24 horas não fechar.
        if (url.searchParams.get("sincronizar") === "1") {
          for (const tipo of ["smb_app_state_sync", "history"]) {
            try {
              const r = await fetch(
                `${GRAPH}/${encodeURIComponent(meta.phone_number_id)}/smb_app_data`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    sync_type: tipo,
                    access_token: seg.page_access_token,
                  }),
                },
              );
              const t = await r.text();
              log(`sincronização manual (${tipo})`, { estado: r.status, corpo: t.slice(0, 500) });
              // Também vai na resposta: o registo desta conta chega com vários
              // minutos de atraso, e a janela da Coexistence é de 24 horas —
              // esperar pelo registo para saber se resultou é tempo que não há.
              saida.push({ tipo, estado: r.status, corpo: t.slice(0, 400) });
            } catch (e) {
              saida.push({ tipo, erro: (e as Error).message });
            }
          }
        }
        // O estado do número também volta na resposta, pela mesma razão.
        try {
          const r = await fetch(
            `${GRAPH}/${encodeURIComponent(meta.phone_number_id)}`
            + `?fields=status,platform_type,is_on_biz_app,code_verification_status`
            + `&access_token=${encodeURIComponent(seg.page_access_token)}`,
          );
          saida.push({ tipo: "estado", corpo: (await r.text()).slice(0, 400) });
        } catch { /* o registo fica com o detalhe */ }
        await ver(
          "apps subscritas na WABA",
          `${GRAPH}/${encodeURIComponent(meta.waba_id)}/subscribed_apps`
          + `?access_token=${encodeURIComponent(seg.page_access_token)}`,
        );
      } else {
        logError("exame da caixa", { temToken: !!seg?.page_access_token, meta });
      }
    }

    return new Response(JSON.stringify({ ok: true, saida }), {
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
    /**
     * Diagnóstico do WhatsApp — perguntar à Meta o que se passa, em vez de adivinhar.
     *
     * PORQUE EXISTE
     *
     * Quando a ligação não presta, o sintoma é sempre o mesmo e não diz nada: a
     * caixa aparece ligada e não chega mensagem nenhuma. As causas possíveis são
     * seis, todas invisíveis deste lado, e cada uma pede uma correção diferente:
     *
     *   1. a app não está subscrita ao campo `messages` do WhatsApp
     *   2. o token não tem a WABA nos `granular_scopes` (a conta nunca foi
     *      mesmo partilhada — o famoso `target_ids: []`)
     *   3. o número não está registado (`DISCONNECTED`/`ON_PREMISE`) porque o
     *      assistente não correu o passo do QR
     *   4. a WABA não está subscrita à nossa app
     *   5. o token expirou
     *   6. a empresa do cliente não está verificada na Meta
     *
     * Cada uma delas custou pelo menos uma tarde a descobrir. Isto pergunta as
     * seis de uma vez e responde por palavras.
     *
     * NÃO ALTERA NADA. Só lê. Pode correr-se as vezes que forem precisas.
     */
    if (body.action === "whatsapp_diagnostico") {
      const appToken = `${appId}|${appSecret}`;

      const achados: Array<{ passo: string; ok: boolean | null; detalhe: string }> = [];
      const add = (passo: string, ok: boolean | null, detalhe: string) =>
        achados.push({ passo, ok, detalhe });

      /** Um GET ao Graph que nunca atira: o diagnóstico não pode morrer a meio. */
      const graph = async (caminho: string, token: string) => {
        try {
          const sep = caminho.includes("?") ? "&" : "?";
          const r = await fetch(
            `${GRAPH}/${caminho}${sep}access_token=${encodeURIComponent(token)}`,
          );
          return await r.json().catch(() => ({}));
        } catch (e) {
          return { error: { message: (e as Error).message } };
        }
      };

      // ── 1. Os segredos estão lá? ──────────────────────────────────────────
      const cfgWa = Deno.env.get("WHATSAPP_LOGIN_CONFIG_ID") || "";
      const emFalta = [
        !appId && "FACEBOOK_APP_ID",
        !appSecret && "FACEBOOK_APP_SECRET",
        !cfgWa && "WHATSAPP_LOGIN_CONFIG_ID",
        !Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") && "META_WEBHOOK_VERIFY_TOKEN",
      ].filter(Boolean);
      add(
        "Segredos da app no Supabase",
        emFalta.length === 0,
        emFalta.length ? `em falta: ${emFalta.join(", ")}` : "estão todos presentes",
      );

      // ── 2. A app está subscrita às mensagens de WhatsApp? ─────────────────
      //
      // Este é o assassino silencioso número um. A subscrição é ao nível da APP
      // (painel da Meta → Webhooks), não da conta do cliente. Se o campo
      // `messages` não estiver lá, NENHUM cliente recebe nada, para sempre, e
      // nada no CRM o denuncia.
      const subsApp = await graph(`${appId}/subscriptions`, appToken);
      if (subsApp?.error) {
        add("Webhooks da app", null,
          `não foi possível verificar: ${subsApp.error.message ?? "erro do Graph"}`);
      } else {
        const objs = (subsApp?.data ?? []) as Array<Record<string, any>>;
        const wa = objs.find((s) => s.object === "whatsapp_business_account");
        const campos = ((wa?.fields ?? []) as Array<any>)
          .map((f) => (typeof f === "string" ? f : f?.name)).filter(Boolean);
        add(
          "App subscrita a `messages` do WhatsApp",
          campos.includes("messages"),
          wa
            ? `campos subscritos: ${campos.join(", ") || "nenhum"}`
            : "o objeto `whatsapp_business_account` não tem subscrição nenhuma "
              + "— nenhum cliente vai receber mensagens",
        );
      }

      // ── 3. As caixas desta organização ────────────────────────────────────
      const { data: canais } = await admin.from("messaging_channels")
        .select("id, label, status, metadata")
        .eq("organization_id", orgId)
        .eq("channel_type", "whatsapp");

      if (!canais?.length) {
        add("Caixas de WhatsApp", false, "esta organização não tem nenhuma ligada");
        return jsonRes({ achados, caixas: [] });
      }

      const caixas: Array<Record<string, unknown>> = [];

      for (const canal of canais) {
        const meta = (canal.metadata ?? {}) as Record<string, string>;
        const numeroId = meta.phone_number_id;
        const wabaId = meta.waba_id;
        const linha: Array<{ passo: string; ok: boolean | null; detalhe: string }> = [];
        const addC = (passo: string, ok: boolean | null, detalhe: string) =>
          linha.push({ passo, ok, detalhe });

        const { data: seg } = await admin.from("messaging_channel_secrets")
          .select("page_access_token").eq("channel_id", canal.id).maybeSingle();
        const token = seg?.page_access_token ?? "";

        addC("Credenciais guardadas", !!token,
          token ? "sim" : "não há token — a caixa não consegue falar com a Meta");

        if (token) {
          // 3a. O token é válido, e sobre QUE contas?
          //
          // `granular_scopes` é o campo que interessa: mostra, por permissão, os
          // `target_ids` — as WABAs a que ela se aplica. Vazio quer dizer que a
          // pessoa deu a permissão mas nunca escolheu conta nenhuma, que é o
          // resultado de correr o diálogo sem o Cadastro Incorporado.
          const dbg = await graph(
            `debug_token?input_token=${encodeURIComponent(token)}`, appToken);
          const d = dbg?.data ?? {};
          if (dbg?.error || !Object.keys(d).length) {
            addC("Token", null, `não foi possível inspecionar: ${
              dbg?.error?.message ?? "resposta vazia"}`);
          } else {
            const expira = Number(d.expires_at ?? 0);
            addC("Token válido", !!d.is_valid,
              d.is_valid
                ? (expira ? `expira em ${new Date(expira * 1000).toISOString().slice(0, 10)}`
                          : "sem prazo de validade")
                : "a Meta já não o aceita — é preciso voltar a ligar");

            const gs = (d.granular_scopes ?? []) as Array<Record<string, any>>;
            const alvos = gs.flatMap((g) => g.target_ids ?? []);
            addC("A conta de WhatsApp foi mesmo partilhada", alvos.length > 0,
              alvos.length
                ? `contas no token: ${alvos.join(", ")}`
                : "`target_ids` vazio — a permissão foi dada mas nenhuma conta "
                  + "foi escolhida. É o sinal de que o Cadastro Incorporado não correu.");

            const scopes = (d.scopes ?? []) as string[];
            const precisa = ["whatsapp_business_messaging", "whatsapp_business_management"];
            const faltam = precisa.filter((p) => !scopes.includes(p));
            addC("Permissões de WhatsApp no token", faltam.length === 0,
              faltam.length ? `faltam: ${faltam.join(", ")}` : precisa.join(", "));
          }

          // 3b. O número: está REGISTADO? É aqui que a Coexistence morre.
          if (numeroId) {
            const n = await graph(
              `${encodeURIComponent(numeroId)}?fields=status,platform_type,is_on_biz_app,`
              + `code_verification_status,display_phone_number,verified_name,quality_rating`,
              token,
            );
            if (n?.error) {
              addC("Número", false, `a Meta recusou: ${n.error.message}`);
            } else {
              const registado = n.status === "CONNECTED";
              addC("Número registado na Cloud API", registado,
                registado
                  ? `${n.display_phone_number ?? numeroId} — ${n.verified_name ?? "sem nome"}`
                    + `, qualidade ${n.quality_rating ?? "?"}`
                  : `está como ${n.status ?? "?"} (${n.platform_type ?? "?"}`
                    + `, na app do telemóvel: ${n.is_on_biz_app ? "sim" : "não"}). `
                    + "Sem estar CONNECTED a Meta não entrega mensagens nem histórico.");
            }
          } else {
            addC("Número", false, "a caixa não guardou `phone_number_id`");
          }

          // 3c. A WABA: verificada? E subscrita à nossa app?
          if (wabaId) {
            const w = await graph(
              `${encodeURIComponent(wabaId)}?fields=name,account_review_status,`
              + `business_verification_status,country,ownership_type`,
              token,
            );
            if (w?.error) {
              addC("Conta de WhatsApp Business", false, `a Meta recusou: ${w.error.message}`);
            } else {
              addC("Empresa verificada na Meta",
                w.business_verification_status === "verified",
                `verificação: ${w.business_verification_status ?? "?"}`
                + `, revisão da conta: ${w.account_review_status ?? "?"}`);
            }

            const sa = await graph(`${encodeURIComponent(wabaId)}/subscribed_apps`, token);
            const apps = (sa?.data ?? []) as Array<Record<string, any>>;
            const nossa = apps.some((a) =>
              String(a?.whatsapp_business_api_data?.id ?? a?.id ?? "") === appId);
            addC("A conta está subscrita à nossa app", nossa,
              sa?.error
                ? `não foi possível verificar: ${sa.error.message}`
                : nossa
                  ? "sim — os webhooks desta conta vêm para nós"
                  : "não. Sem isto as mensagens desta conta nunca chegam ao CRM.");
          } else {
            addC("Conta de WhatsApp Business", false, "a caixa não guardou `waba_id`");
          }
        }

        caixas.push({
          id: canal.id,
          label: canal.label,
          status: canal.status,
          phone_number_id: numeroId ?? null,
          waba_id: wabaId ?? null,
          achados: linha,
        });
      }

      log("diagnóstico de WhatsApp", { orgId, caixas: caixas.length });
      return jsonRes({ achados, caixas });
    }

    /**
     * Ligar um número de WhatsApp SEM o assistente.
     *
     * Porque existe: o Embedded Signup serve para os CLIENTES ligarem as contas
     * deles, e depende de App Review, estatuto de Tech Provider e de um conjunto
     * de definições no painel da Meta. Para ligar o número da PRÓPRIA empresa
     * nada disso é preciso — basta um token de utilizador do sistema.
     *
     * O token vem de `WHATSAPP_SYSTEM_TOKEN`, um segredo do Supabase que o dono
     * define no painel. Nunca passa pelo browser nem por uma conversa: só os
     * dois identificadores, que não são segredos.
     */
    if (body.action === "whatsapp_manual") {
      const numeroId = String(body.phone_number_id ?? "");
      const wabaId = String(body.waba_id ?? "");
      if (!numeroId || !wabaId) {
        return jsonRes({ error: "phone_number_id e waba_id são obrigatórios" }, 400);
      }

      const token = Deno.env.get("WHATSAPP_SYSTEM_TOKEN");
      if (!token) {
        return jsonRes({
          error: "Falta o segredo WHATSAPP_SYSTEM_TOKEN no Supabase. "
            + "Cria um token de utilizador do sistema no painel da Meta e guarda-o lá.",
        }, 500);
      }

      // O token serve mesmo para este número? Sem esta verificação, um id
      // errado criava uma caixa que nunca receberia nada — e só se descobria
      // dias depois, ao estranhar o silêncio.
      const vRes = await fetch(`${GRAPH}/${numeroId}`
        + `?fields=display_phone_number,verified_name,quality_rating,platform_type,status`
        + `&access_token=${encodeURIComponent(token)}`);
      const num = await vRes.json();
      if (!vRes.ok || num?.error) {
        return jsonRes({
          error: `A Meta não reconhece este número com esse token: ${
            num?.error?.message ?? vRes.status}`,
        }, 400);
      }

      const { data: dono } = await admin.from("messaging_channels")
        .select("id, organization_id").eq("metadata->>phone_number_id", numeroId).maybeSingle();
      if (dono && dono.organization_id !== orgId) {
        return jsonRes({ error: "Este número já está ligado noutra conta do Senvia OS." }, 409);
      }

      return await criarCaixaWhatsApp({
        admin, userToken: token, orgId, label: body.label ?? null,
        origem: null, comoJson: true,
        numero: {
          phone_number_id: numeroId,
          waba_id: wabaId,
          waba_name: body.waba_name ?? null,
          display_phone_number: num?.display_phone_number ?? null,
          verified_name: num?.verified_name ?? null,
          quality_rating: num?.quality_rating ?? null,
        },
      });
    }

    // O que o browser precisa para abrir o assistente do WhatsApp pelo SDK.
    // Nem o id da app nem o da configuração são segredos — vão no URL do
    // diálogo de qualquer maneira.
    if (body.action === "whatsapp_params") {
      const cfg = Deno.env.get("WHATSAPP_LOGIN_CONFIG_ID") || "";
      if (!appId || !cfg) {
        return jsonRes({
          error: "Falta FACEBOOK_APP_ID ou WHATSAPP_LOGIN_CONFIG_ID nos segredos.",
        }, 500);
      }
      // `es_version` é a versão do Cadastro Incorporado e NÃO é o mesmo que a
      // versão do Graph. Vai daqui, e não fixa no browser, para se poder subir
      // sem publicar frontend — foi tê-la em falta que partiu a troca do código.
      return jsonRes({
        app_id: appId,
        config_id: cfg,
        graph_version: "v24.0",
        es_version: "v3",
        feature_type: "whatsapp_business_app_onboarding",
      });
    }

    /**
     * Concluir o emparelhamento de Coexistence, DEPOIS do assistente do SDK.
     *
     * Porquê separado da ligação: o número fica `DISCONNECTED`/`ON_PREMISE` se
     * o Cadastro Incorporado não correr com session logging, e o session
     * logging só existe quando o assistente é lançado pelo SDK. O fluxo por
     * redirect partilha a conta (é por isso que a caixa se cria) mas não
     * regista o número, e sem registo a Meta não entrega nada — nem mensagens,
     * nem histórico. As duas chamadas de saída ficam trancadas uma na outra:
     * `/register` responde "not available for SMB businesses" e `smb_app_data`
     * responde "(#133010) Account not registered".
     *
     * Esta ação NÃO troca código nenhum. O token já existe, veio do redirect, e
     * é o do canal. Assim a troca do SDK — que falha sempre com o subcódigo
     * 36008, por razão nunca explicada — deixa de estar no caminho.
     */
    if (body.action === "whatsapp_pairing") {
      const numeroId = String(body.phone_number_id ?? "");
      const wabaId = String(body.waba_id ?? "");
      if (!numeroId && !wabaId) {
        return jsonRes({ error: "O assistente não indicou o número." }, 400);
      }

      // A caixa e o token dela. Procura-se pelo número; se o assistente só
      // disser a conta, aceita-se a caixa dessa conta.
      let q = admin.from("messaging_channels")
        .select("id, label, metadata")
        .eq("organization_id", orgId)
        .eq("channel_type", "whatsapp");
      q = numeroId
        ? q.eq("metadata->>phone_number_id", numeroId)
        : q.eq("metadata->>waba_id", wabaId);
      const { data: canal } = await q.maybeSingle();

      if (!canal) {
        return jsonRes({
          error: "Não encontrámos a caixa deste número. Liga primeiro o WhatsApp e só depois conclui o emparelhamento.",
        }, 404);
      }

      const { data: seg } = await admin.from("messaging_channel_secrets")
        .select("page_access_token").eq("channel_id", canal.id).maybeSingle();
      if (!seg?.page_access_token) {
        return jsonRes({ error: "A caixa não tem credenciais guardadas. Volta a ligar o WhatsApp." }, 400);
      }

      const meta = (canal.metadata ?? {}) as Record<string, string>;
      const alvo = numeroId || meta.phone_number_id;
      const token = seg.page_access_token;

      const estado = await fetch(
        `${GRAPH}/${encodeURIComponent(alvo)}`
        + `?fields=status,platform_type,is_on_biz_app,code_verification_status,display_phone_number`
        + `&access_token=${encodeURIComponent(token)}`,
      ).then((r) => r.json()).catch(() => ({}));

      // Pedir contactos e histórico. Só resulta se o assistente tiver mesmo
      // registado o número — se não, volta o 133010, e é isso que se mostra.
      const sincronia: Array<{ tipo: string; ok: boolean; erro: string | null }> = [];
      for (const tipo of ["smb_app_state_sync", "history"]) {
        try {
          const r = await fetch(`${GRAPH}/${encodeURIComponent(alvo)}/smb_app_data`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messaging_product: "whatsapp", sync_type: tipo, access_token: token }),
          });
          const j = await r.json().catch(() => ({}));
          sincronia.push({ tipo, ok: r.ok, erro: j?.error?.message ?? null });
        } catch (e) {
          sincronia.push({ tipo, ok: false, erro: (e as Error).message });
        }
      }

      log("emparelhamento de Coexistence", { canal: canal.id, estado, sincronia });

      const registado = estado?.status === "CONNECTED";
      return jsonRes({
        registado,
        estado: {
          status: estado?.status ?? null,
          platform_type: estado?.platform_type ?? null,
          is_on_biz_app: estado?.is_on_biz_app ?? null,
        },
        sincronia,
        // A mensagem é escrita aqui e não no browser: o que distingue os casos
        // são os códigos da Meta, e eles vivem deste lado.
        mensagem: registado
          ? "Número registado. Pedimos os contactos e o histórico — chegam por webhook nos próximos minutos."
          : `A Meta ainda tem o número como ${estado?.status ?? "desconhecido"}`
            + ` (${estado?.platform_type ?? "?"}). O assistente não chegou a registá-lo:`
            + ` confirma no telemóvel, na app WhatsApp Business, se há um pedido de ligação por aceitar.`,
      });
    }

    /**
     * Concluir o assistente do WhatsApp.
     *
     * O SDK devolve TRÊS coisas: o código (para trocar por token), o `waba_id` e
     * o `phone_number_id` — os dois últimos vindos do próprio assistente, da
     * conta que a pessoa escolheu lá dentro.
     *
     * É isso que torna esta via melhor do que a anterior: já não se adivinha a
     * conta a partir das permissões do token. Foi essa adivinha que ligou a
     * conta de um cliente à caixa da agência.
     */
    if (body.action === "whatsapp_signup") {
      const code = String(body.code ?? "");
      const wabaId = String(body.waba_id ?? "");
      const numeroId = String(body.phone_number_id ?? "");
      if (!code) return jsonRes({ error: "code em falta" }, 400);
      if (!appId || !appSecret) return jsonRes({ error: "App da Meta mal configurada" }, 500);

      // Troca do código pelo token. Server-to-server, com o App Secret — é por
      // isto que o código não serve de nada a quem o intercete.
      //
      // `redirect_uri` VAZIO é a forma certa para códigos vindos do SDK, e é
      // literalmente o que a app de referência da Meta faz (o `redirectUri` do
      // publicConfig dela é a string vazia). Houve uma fase em que se tentaram
      // cinco variantes porque a Meta recusava tudo com "make sure your
      // redirect_uri is identical" — mensagem que MENTE: o subcódigo dizia
      // 36008, ou seja, o código já tinha sido gasto pelo próprio SDK antes de
      // cá chegar. Corrigiu-se na origem (ver `useWhatsAppSignup`), e as
      // variantes saíram: cada tentativa extra arrisca gastar o código e só
      // enche o registo de ruído.
      const formas: Array<{ nome: string; uri: string | null }> = [
        { nome: "redirect_uri vazio (forma do SDK)", uri: "" },
        { nome: "sem redirect_uri", uri: null },
      ];

      let tJson: { access_token?: string; error?: { message?: string } } = {};
      let recusa = "";
      for (const f of formas) {
        const url = `${GRAPH}/oauth/access_token`
          + `?client_id=${encodeURIComponent(appId)}`
          + `&client_secret=${encodeURIComponent(appSecret)}`
          + (f.uri === null ? "" : `&redirect_uri=${encodeURIComponent(f.uri)}`)
          + `&code=${encodeURIComponent(code)}`;
        const r = await fetch(url);
        const j = await r.json().catch(() => ({}));
        if (j.access_token) {
          tJson = j;
          log("troca do código conseguida", { forma: f.nome });
          break;
        }
        const sub = Number(j?.error?.error_subcode ?? 0);
        // A frase da Meta é a mesma para causas diferentes; o subcódigo é que
        // as separa. Traduzir aqui poupa a próxima pessoa a horas no painel.
        // CUIDADO com o 36008: NÃO é "código já usado" — esse é o 36009. O
        // 36008 é a falha de validação genérica, e traduzi-lo por "já usado"
        // mandou-nos investigar caches do SDK durante horas. Fica sem tradução
        // inventada: o que se sabe é o que a Meta diz.
        const leitura = sub === 36009
          ? "o código já tinha sido usado"
          : sub === 36008
          ? "a Meta recusou o código sem dizer porquê (36008 é a falha genérica de validação)"
          : sub === 36007
          ? "o código expirou — passaram mais de 30 segundos entre o assistente e esta chamada"
          : j?.error?.message ?? String(r.status);
        recusa = `${leitura} [forma=${f.nome} code=${j?.error?.code ?? "?"} sub=${sub || "-"}`
          + ` trace=${j?.error?.fbtrace_id ?? "-"}]`;
        logError("troca do código recusada", { recusa });
        // Expirado ou já usado não melhora com outra forma — não insistir.
        if (sub === 36007 || sub === 36009) break;
      }

      if (!tJson.access_token) {
        logError("troca do código falhou", { recusa });
        return jsonRes({
          error: (recusa || "Falha ao obter o token") + " — volta a tentar a ligação.",
        }, 502);
      }

      // O assistente nem sempre nos diz qual a conta — a mensagem da sessão e o
      // código chegam por caminhos diferentes e a primeira pode perder-se. Em
      // vez de falhar uma ligação que correu bem, descobre-se pelo token; e se
      // houver mais do que uma conta, PERGUNTA-SE.
      if (!wabaId || !numeroId) {
        log("assistente sem ids — a descobrir pelo token");
        return await ligarWhatsApp({
          admin, userToken: tJson.access_token, orgId, label: body.label,
          appId: appId!, appSecret: appSecret!,
          origem: null, supabaseUrl: supabaseUrl!, comoJson: true,
        });
      }

      const { data: dados } = await admin
        .from("messaging_channels")
        .select("id, organization_id")
        .eq("metadata->>phone_number_id", numeroId)
        .maybeSingle();
      if (dados && dados.organization_id !== orgId) {
        return jsonRes({ error: "Este número já está ligado noutra conta do Senvia OS." }, 409);
      }

      // Os detalhes do número, para a caixa ter nome em vez de um id.
      const nRes = await fetch(`${GRAPH}/${numeroId}`
        + `?fields=display_phone_number,verified_name,quality_rating,platform_type`
        + `&access_token=${encodeURIComponent(tJson.access_token)}`);
      const num = await nRes.json().catch(() => ({}));

      return await criarCaixaWhatsApp({
        admin,
        userToken: tJson.access_token,
        orgId,
        label: body.label ?? null,
        origem: null,
        comoJson: true,
        numero: {
          phone_number_id: numeroId,
          waba_id: wabaId,
          waba_name: body.waba_name ?? null,
          display_phone_number: num?.display_phone_number ?? null,
          verified_name: num?.verified_name ?? null,
          quality_rating: num?.quality_rating ?? null,
        },
      });
    }

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
    // TODOS os canais entram pelo mesmo diálogo de OAuth, incluindo o WhatsApp.
    //
    // Houve uma versão que mandava o WhatsApp para o endereço do Cadastro
    // Incorporado alojado pela Meta (`business.facebook.com/messaging/whatsapp/
    // onboard/`), porque só ele corre o assistente que cria a conta, adiciona o
    // número e o verifica. Não presta como entrada direta: abre, mostra o ecrã
    // inicial, abre um SEGUNDO popup de login por cima, e nunca redireciona de
    // volta para o `redirect_uri` — zero pedidos chegam a esta função. Aquele
    // endereço é para ser lançado pelo SDK da Meta, e o SDK também não serve
    // (devolve o código já gasto — ver `useMessagingChannels`).
    //
    // O diálogo simples volta sempre, e foi ele que criou as caixas que existem.
    // A contrapartida honesta: ele NÃO corre o assistente de criação. Serve
    // quem já tem o número no WhatsApp Business — que é o caso dos 98% que
    // querem espelhar o telemóvel no CRM. Quem ainda não tem conta cria-a no
    // Meta Business e volta aqui.
    const dialog = `https://www.facebook.com/v21.0/dialog/oauth`
      + `?client_id=${encodeURIComponent(appId)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&config_id=${encodeURIComponent(configDoCanal)}`
      + `&state=${encodeURIComponent(state)}`
      + `&response_type=code`
      // NÃO TIRAR ISTO. É o `extras` que faz o diálogo correr o Cadastro
      // Incorporado — o passo onde a pessoa ESCOLHE a conta de WhatsApp. Sem
      // ele a Meta concede as permissões sobre coisa nenhuma e o `debug_token`
      // devolve `target_ids: []`, que parece "esta pessoa não tem WhatsApp".
      //
      // Já foi apagado uma vez, sem intenção, ao reverter o endereço do
      // assistente alojado: o `extras` viajava na mesma expressão e saiu com
      // ele. Custou uma tarde inteira a encontrar, porque o sintoma aponta
      // para permissões e a causa está aqui.
      //
      // Coexistence — o número fica na app do WhatsApp Business e traz os
      // contactos e 180 dias de histórico.
      //
      // Só `featureType` chegou para a Meta partilhar a conta (os target_ids
      // deixaram de vir vazios), mas NÃO para mostrar o passo do código QR que
      // emparelha o telemóvel — e sem esse passo o número fica
      // `ON_PREMISE`/`DISCONNECTED` e não chega mensagem nenhuma.
      //
      // Estes três campos são os da app de referência da Meta
      // (`ClientDashboard.tsx`, `computeEsConfig`). Nada aqui é inventado: já
      // se partiu isto uma vez com um campo imaginado, e o sintoma foi voltar
      // a `target_ids: []`. Se isso acontecer, o suspeito é esta linha.
      + (connect === "whatsapp"
        ? `&extras=${encodeURIComponent(JSON.stringify({
          sessionInfoVersion: "3",
          version: "v3",
          featureType: "whatsapp_business_app_onboarding",
        }))}`
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
