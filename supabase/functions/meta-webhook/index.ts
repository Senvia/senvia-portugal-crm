// meta-webhook — recebe mensagens de Instagram e Messenger direto da Meta.
//
// Sem Chatwoot: a Meta entrega aqui, guardamos em meta_conversations /
// meta_messages, e o CRM lê de lá. O Chatwoot fica só com o email.
//
// Duas entradas, como a Meta exige:
//   GET  ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
//        -> devolve o challenge, é assim que ela valida o endereço
//   POST -> os eventos
//
// Sobre a assinatura: a Meta assina cada POST em X-Hub-Signature-256 com o App
// Secret. É verificada — sem isso, qualquer pessoa que descubra este endereço
// podia injetar mensagens falsas nas conversas dos clientes.

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

const log = (s: string, d?: unknown) =>
  console.log(`[META-WEBHOOK] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);
const logError = (s: string, d?: unknown) =>
  console.error(`[META-WEBHOOK] ERROR ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

/** A janela de resposta da Meta: 24h desde a última mensagem DA PESSOA. */
const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * O nome de quem escreveu, pela API de CONVERSAS.
 *
 * Existe porque a API de perfil (`GET /{psid}`) não serve toda a gente: com a
 * app em Acesso Padrão, a Meta só devolve o perfil de quem tem cargo nela e
 * responde `(#100) subcode 33` a todos os outros. Ou seja, os contactos de
 * teste apareciam com nome e os clientes reais como um número de 17 dígitos.
 *
 * A API de conversas é outra porta e devolve o nome verdadeiro — confirmado
 * contra a produção: o mesmo identificador que a de perfil recusou veio aqui
 * como "Phillips Steven".
 *
 * Duas notas do que se aprendeu a testar isto:
 *  - No Messenger, `participants` devolve o marcador "Usuário do Facebook"; é
 *    `messages{from}` que traz o nome a sério. No Instagram servem os dois.
 *  - `messages` vem da mais recente para trás e a mais recente pode ser NOSSA,
 *    por isso procura-se a primeira cujo autor é mesmo a pessoa.
 *
 * A fotografia não tem equivalente: para quem a app não alcança, a Meta serve
 * a silhueta genérica. Isso só a App Review resolve.
 */
async function nomePelaConversa(
  pageId: string,
  senderId: string,
  ehInstagram: boolean,
  token: string,
): Promise<string | null> {
  const url = new URL(`https://graph.facebook.com/v21.0/${pageId}/conversations`);
  if (ehInstagram) url.searchParams.set("platform", "instagram");
  url.searchParams.set("user_id", senderId);
  url.searchParams.set("fields", "participants,messages.limit(10){from}");
  url.searchParams.set("access_token", token);

  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok || body?.error) {
    log("conversa sem nome disponível", { senderId, erro: body?.error?.message });
    return null;
  }

  const conversa = body?.data?.[0];
  if (!conversa) return null;

  interface Autor { id?: string; name?: string; username?: string }

  const daPessoa = (a: Autor | undefined) => a?.id === senderId;
  const doAutor = (a: Autor | undefined) =>
    a?.username ? `@${a.username}` : (a?.name ?? null);

  const msg = (conversa.messages?.data ?? [] as Array<{ from?: Autor }>)
    .find((m: { from?: Autor }) => daPessoa(m.from));
  const pelaMensagem = doAutor(msg?.from);
  if (pelaMensagem) return pelaMensagem;

  const participante = (conversa.participants?.data ?? [] as Autor[]).find(daPessoa);
  return doAutor(participante);
}

async function signatureValid(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const expected = [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
  const received = header.slice(7);
  // Comparação de tempo constante: uma comparação normal desiste no primeiro
  // byte diferente e deixa adivinhar a assinatura pelo tempo de resposta.
  if (expected.length !== received.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  return diff === 0;
}

interface MetaMessaging {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    reply_to?: { mid?: string };
    attachments?: Array<{ type?: string; payload?: { url?: string } }>;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // ── Verificação do endereço ───────────────────────────────────────────────
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");

    if (mode === "subscribe" && expected && token === expected) {
      log("endereço verificado pela Meta");
      return new Response(challenge ?? "", { status: 200, headers: corsHeaders });
    }
    logError("verificação recusada", { mode, temToken: !!token, temSegredo: !!expected });
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
  const raw = await req.text();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (!appSecret) {
    logError("FACEBOOK_APP_SECRET em falta — a recusar");
    return new Response("Not configured", { status: 500, headers: corsHeaders });
  }

  const sigOk = await signatureValid(raw, req.headers.get("x-hub-signature-256"), appSecret);

  // Regista SEMPRE que fomos chamados, mesmo quando se recusa. Sem isto, uma
  // subscrição mal configurada e uma assinatura inválida são indistinguíveis:
  // nos dois casos não aparece mensagem nenhuma e não há onde olhar.
  let logId: string | null = null;
  try {
    const { data } = await supabase.from("meta_webhook_log").insert({
      method: "POST",
      valid_sig: sigOk,
      body_head: raw.slice(0, 800),
      note: sigOk ? null : "assinatura recusada",
      outcome: sigOk ? "recebido" : "assinatura_invalida",
    }).select("id").single();
    logId = data?.id ?? null;
  } catch { /* diagnóstico não pode partir o webhook */ }

  /** Anota no registo o que aconteceu a este pedido. */
  const anotar = async (campos: Record<string, unknown>) => {
    if (!logId) return;
    await supabase.from("meta_webhook_log").update(campos).eq("id", logId)
      .then(() => {}, () => {});
  };

  if (!sigOk) {
    logError("assinatura inválida — pedido recusado");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  // A partir daqui responde-se SEMPRE 200. A Meta reentrega em qualquer outro
  // código e, se o nosso lado tiver um bug, uma reentrega infinita é pior do que
  // uma mensagem perdida — o erro fica nos logs, que é onde se vai procurar.
  let resultado = "sem_eventos";
  let orgVista: string | null = null;
  let paginaVista: string | null = null;

  try {
    const body = JSON.parse(raw);
    // A Meta diz-nos qual dos dois produtos é: "instagram" ou "page". Sem isto
    // o encaminhamento adivinhava, e uma Página ligada às duas caixas (Instagram
    // e Messenger são linhas separadas com o mesmo page_id) recebia as mensagens
    // do Messenger na caixa do Instagram — ao acaso, conforme a ordem em que o
    // Postgres devolvesse as linhas.
    const ehInstagram = body.object === "instagram";

    for (const entry of body.entry ?? []) {
      // `messaging` no Messenger; o Instagram usa a mesma forma. `standby` é
      // outra coisa: significa que OUTRA app tem o controlo da conversa.
      const emStandby = !entry.messaging && !!entry.standby;
      const events: MetaMessaging[] = entry.messaging ?? entry.standby ?? [];

      for (const ev of events) {
        // Uma entrega da Meta traz vários eventos, e podem ser de PÁGINAS —
        // logo, de ORGANIZAÇÕES — diferentes. Antes, um erro em qualquer um
        // abortava o resto do lote; e como respondemos sempre 200, a Meta nunca
        // reentregava. Um cliente perdia mensagens por causa de outro.
        try {
          // `is_echo` são as nossas próprias mensagens devolvidas pela Meta.
          // Guardá-las duplicaria tudo o que enviamos.
          if (ev.message?.is_echo) continue;

          const senderId = ev.sender?.id;
          const pageId = String(entry.id ?? ev.recipient?.id ?? "");
          if (!senderId || !pageId) continue;
          paginaVista = pageId;

          // Que caixa é esta? No Instagram o `entry.id` é o id da CONTA
          // (ig_account_id); no Messenger é o id da PÁGINA.
          //
          // Isto era um `.or("metadata->>page_id.eq.X,metadata->>ig_account_id.eq.X")`
          // — e falhava em silêncio. O erro do PostgREST nem era verificado, por
          // isso o canal vinha nulo, o evento era descartado como "página que não
          // temos ligada", e ficava uma mensagem real perdida sem rasto.
          const findChannel = async (col: "ig_account_id" | "page_id", tipo?: string) => {
            let q = supabase
              .from("messaging_channels")
              .select("id, organization_id, channel_type, metadata")
              .eq(`metadata->>${col}`, pageId);
            if (tipo) q = q.eq("channel_type", tipo);
            const { data, error } = await q.limit(1).maybeSingle();
            if (error) logError(`procura de canal por ${col} falhou`, { error: error.message });
            return data;
          };

          const channel = ehInstagram
            ? (await findChannel("ig_account_id", "instagram") ?? await findChannel("page_id", "instagram"))
            : await findChannel("page_id", "facebook");

          if (!channel) {
            log("evento para uma página que não temos ligada", { pageId, objeto: body.object });
            resultado = "sem_canal";
            continue;
          }
          orgVista = channel.organization_id;

          // Reação a uma mensagem nossa. Não é mensagem nova — anota-se na
          // mensagem reagida, para aparecer colada a ela como no Instagram.
          //
          // Fica DEPOIS de encontrar o canal, e limitada à organização dele: em
          // cima e sem filtro, um evento de reação de uma Página que nem sequer
          // temos ligada escrevia na base de dados de qualquer cliente.
          const reac = (ev as { reaction?: { mid?: string; emoji?: string; action?: string } }).reaction;
          if (reac?.mid) {
            const { error } = await supabase.from("meta_messages")
              .update({
                reaction: reac.action === "unreact" ? null : (reac.emoji ?? "❤️"),
                reaction_by: reac.action === "unreact" ? null : "contact",
              })
              .eq("organization_id", channel.organization_id)
              .eq("external_id", reac.mid);
            if (error) logError("falha a gravar a reação", { error: error.message });
            else log("reação recebida", { mid: reac.mid, emoji: reac.emoji, action: reac.action });
            resultado = "reacao";
            continue;
          }

          // Mensagem apagada pela pessoa. Vinha sem texto e sem anexos, por isso
          // era descartada — e ficava visível no CRM para sempre, depois de o
          // cliente a ter retirado. O agente respondia a algo que já não existe.
          const apagada = (ev.message as { is_deleted?: boolean } | undefined)?.is_deleted;
          if (apagada && ev.message?.mid) {
            await supabase.from("meta_messages")
              .update({ content: null, attachments: [], is_deleted: true })
              .eq("organization_id", channel.organization_id)
              .eq("external_id", ev.message.mid);
            log("mensagem apagada pelo contacto", { mid: ev.message.mid });
            resultado = "apagada";
            continue;
          }

          const text = ev.message?.text ?? "";
          const attachments = (ev.message?.attachments ?? []).map((a) => ({
            type: a.type ?? "file",
            url: a.payload?.url ?? null,
          }));
          if (!text && attachments.length === 0) continue;

          const at = ev.timestamp ? new Date(ev.timestamp) : new Date();
          const resumo = text || `[${attachments[0]?.type ?? "anexo"}]`;
          const janelaNova = new Date(at.getTime() + REPLY_WINDOW_MS).toISOString();

          // Resposta a um story: a Meta manda o story em `reply_to.story`, não
          // como anexo. Sem isto o agente via "adorei isto!" sem saber a quê.
          const story = (ev.message as {
            reply_to?: { story?: { url?: string; id?: string } };
          } | undefined)?.reply_to?.story;
          if (story?.url) {
            attachments.unshift({ type: "story_reply", url: story.url });
          }

          // De onde veio esta conversa: anúncio, link ig.me com ?ref=, botão.
          const ref = (ev as {
            message?: { referral?: Record<string, unknown> };
            referral?: Record<string, unknown>;
          }).message?.referral ?? (ev as { referral?: Record<string, unknown> }).referral;

          // A conversa: lê-se antes de escrever para não ANDAR PARA TRÁS. Um
          // upsert cego reescrevia `window_expires_at` com o valor de uma
          // mensagem mais antiga reentregue fora de ordem — e encurtava a janela
          // de resposta sem razão nenhuma.
          const { data: existente } = await supabase
            .from("meta_conversations")
            .select("id, contact_name, last_message_at, window_expires_at")
            .eq("channel_id", channel.id)
            .eq("contact_ref", senderId)
            .maybeSingle();

          let conv: { id: string; contact_name: string | null } | null = null;

          if (existente) {
            const maisRecente = !existente.last_message_at
              || new Date(existente.last_message_at) <= at;
            const janela = existente.window_expires_at && existente.window_expires_at > janelaNova
              ? existente.window_expires_at
              : janelaNova;
            const { data, error } = await supabase.from("meta_conversations").update({
              ...(maisRecente ? { last_message: resumo, last_message_at: at.toISOString() } : {}),
              // Cada mensagem da pessoa reabre a janela de 24 horas.
              window_expires_at: janela,
              status: "open",
              updated_at: new Date().toISOString(),
            }).eq("id", existente.id).select("id, contact_name").single();
            if (error) { logError("falha a atualizar a conversa", { error: error.message }); continue; }
            conv = data;
          } else {
            const { data, error } = await supabase.from("meta_conversations").insert({
              organization_id: channel.organization_id,
              channel_id: channel.id,
              contact_ref: senderId,
              last_message: resumo,
              last_message_at: at.toISOString(),
              window_expires_at: janelaNova,
              status: "open",
              ...(ref ? { source_ref: ref } : {}),
            }).select("id, contact_name").single();
            if (error) { logError("falha a criar a conversa", { error: error.message }); continue; }
            conv = data;
          }

          if (!conv) continue;
          if (emStandby) {
            // Outra app (a Caixa de Entrada da Meta, por exemplo) tem o controlo
            // desta conversa. Guarda-se a mensagem, mas responder daqui falha ou
            // duplica a resposta — por isso fica marcado.
            await supabase.from("meta_conversations")
              .update({ status: "standby" }).eq("id", conv.id);
          }

          // Nome e foto de quem escreveu.
          //
          // A Meta não os manda no webhook — só o identificador. Sem este pedido
          // extra a conversa aparece como "682024387765816", que não diz nada a
          // quem tem de responder.
          //
          // Só se pede uma vez, quando ainda não temos nome: é uma chamada por
          // contacto novo, não por mensagem.
          if (!conv.contact_name) {
            // O token vive em messaging_channel_secrets, fora do alcance do cliente.
            const { data: sec } = await supabase
              .from("messaging_channel_secrets")
              .select("page_access_token")
              .eq("channel_id", channel.id)
              .maybeSingle();
            const pageToken = sec?.page_access_token;
            if (pageToken) {
              try {
                // Os campos NÃO são os mesmos nos dois canais. `username`,
                // `follower_count` e companhia só existem no Instagram — pedi-los
                // a um PSID do Messenger faz a Graph API rejeitar o pedido
                // INTEIRO ("nonexisting field"), e a conversa ficava com o
                // número em vez do nome, sem se perceber porquê.
                const campos = ehInstagram
                  ? "name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business"
                  : "name,first_name,last_name,profile_pic";
                const profRes = await fetch(
                  `https://graph.facebook.com/v21.0/${senderId}`
                  + `?fields=${campos}`
                  + `&access_token=${encodeURIComponent(pageToken)}`,
                );
                const prof = profRes.ok ? await profRes.json() : {};
                const temPerfil = profRes.ok && !prof?.error;

                // No Messenger não há @: usa-se o nome, ou o primeiro e último
                // se a Meta só devolver esses.
                let nome: string | null = temPerfil
                  ? (prof.username
                    ? `@${prof.username}`
                    : (prof.name
                      || [prof.first_name, prof.last_name].filter(Boolean).join(" ")
                      || null))
                  : null;

                // Sem perfil, tenta-se a API de conversas. É o caso NORMAL para
                // clientes reais enquanto a app não tiver a App Review: a API de
                // perfil só serve quem tem cargo na app.
                if (!nome) {
                  nome = await nomePelaConversa(
                    ehInstagram ? (channel.metadata as { page_id?: string } | null)?.page_id ?? pageId : pageId,
                    senderId,
                    ehInstagram,
                    pageToken,
                  ).catch(() => null);
                }

                if (nome || temPerfil) {
                  await supabase.from("meta_conversations").update({
                    contact_name: nome,
                    // Atenção: este endereço é assinado e EXPIRA. Guarda-se para
                    // ter foto já; quando deixar de abrir, basta limpar o nome
                    // que o próximo webhook volta a pedir os dois.
                    contact_avatar_url: temPerfil ? (prof.profile_pic ?? null) : null,
                    contact_meta: {
                      follower_count: prof.follower_count ?? null,
                      is_verified: prof.is_verified_user ?? null,
                      follows_us: prof.is_user_follow_business ?? null,
                      // Sem perfil não há fotografia: a Meta serve a silhueta
                      // genérica. Fica registado para a interface poder explicar
                      // porquê em vez de mostrar um vazio.
                      perfil_indisponivel: !temPerfil,
                    },
                  }).eq("id", conv.id);
                  log("nome obtido", { senderId, nome, viaPerfil: temPerfil });
                } else {
                  // Nem a API de perfil nem a de conversas deram nome. Raro — a
                  // conversa funciona à mesma, só sem ele.
                  log("sem nome por nenhuma das vias", { senderId, erro: prof?.error?.message });
                }
              } catch (e) {
                log("falha a obter o perfil", { senderId, error: (e as Error).message });
              }
            }
          }

          const { error: msgErr } = await supabase.from("meta_messages").insert({
            organization_id: channel.organization_id,
            conversation_id: conv.id,
            external_id: ev.message?.mid ?? null,
            direction: "incoming",
            content: text || null,
            // A que mensagem esta responde, quando é uma resposta.
            reply_to_external_id: ev.message?.reply_to?.mid ?? null,
            attachments,
            // Quando a Meta diz que foi enviada, não quando chegou aqui: uma
            // reentrega atrasada aparecia no fim da conversa, fora de ordem.
            sent_at: at.toISOString(),
          });

          // 23505 = já existe. Os webhooks são entregues pelo menos uma vez, por
          // isso repetições são NORMAIS — o índice único faz o seu trabalho e não
          // há nada a assinalar.
          if (msgErr && (msgErr as { code?: string }).code !== "23505") {
            logError("falha a gravar a mensagem", { error: msgErr.message });
            resultado = "erro";
            continue;
          }

          if (!msgErr) {
            await supabase.rpc("increment_meta_unread", { _conversation_id: conv.id })
              .then(() => {}, () => {
                // Sem a função, o contador fica na mesma — a mensagem é o que
                // importa e já está guardada.
              });
            log("mensagem guardada", { canal: channel.channel_type, conversa: conv.id });
            resultado = "guardada";
          } else {
            resultado = "duplicada";
          }
        } catch (e) {
          // Só este evento se perde. Os outros do mesmo lote — que podem ser de
          // outros clientes — seguem em frente.
          logError("evento ignorado por erro", { error: (e as Error).message });
          resultado = "erro";
        }
      }
    }
  } catch (e) {
    logError("erro a processar", { error: (e as Error).message });
    resultado = "erro";
  }

  await anotar({
    outcome: resultado,
    page_id: paginaVista,
    organization_id: orgVista,
    // O corpo bruto tem o texto das mensagens dos clientes. Depois de a
    // assinatura estar validada e o evento processado, deixa de fazer falta —
    // e sem isto o registo de diagnóstico era um arquivo permanente de dados
    // pessoais de várias organizações, fora do alcance do pedido de eliminação.
    body_head: raw.slice(0, 200).replace(/"text":"[^"]*"/g, '"text":"[removido]"'),
  });

  return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
});
