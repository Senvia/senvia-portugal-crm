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
  await supabase.from("meta_webhook_log").insert({
    method: "POST",
    valid_sig: sigOk,
    body_head: raw.slice(0, 800),
    note: sigOk ? null : "assinatura recusada",
  }).then(() => {}, () => { /* diagnóstico não pode partir o webhook */ });

  if (!sigOk) {
    logError("assinatura inválida — pedido recusado");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  // A partir daqui responde-se SEMPRE 200. A Meta reentrega em qualquer outro
  // código e, se o nosso lado tiver um bug, uma reentrega infinita é pior do que
  // uma mensagem perdida — o erro fica nos logs, que é onde se vai procurar.
  try {
    const body = JSON.parse(raw);

    for (const entry of body.entry ?? []) {
      // `messaging` no Messenger; o Instagram usa a mesma forma.
      const events: MetaMessaging[] = entry.messaging ?? entry.standby ?? [];

      for (const ev of events) {
        // `is_echo` são as nossas próprias mensagens devolvidas pela Meta.
        // Guardá-las duplicaria tudo o que enviamos.
        if (ev.message?.is_echo) continue;

        const senderId = ev.sender?.id;
        const pageId = String(entry.id ?? ev.recipient?.id ?? "");
        if (!senderId || !pageId) continue;

        // Reação a uma mensagem nossa. Não é mensagem nova — anota-se na
        // mensagem reagida, para aparecer colada a ela como no Instagram.
        const reac = (ev as { reaction?: { mid?: string; emoji?: string; action?: string } }).reaction;
        if (reac?.mid) {
          const { error } = await supabase.from("meta_messages")
            .update({
              reaction: reac.action === "unreact" ? null : (reac.emoji ?? "❤️"),
              reaction_by: reac.action === "unreact" ? null : "contact",
            })
            .eq("external_id", reac.mid);
          if (error) logError("falha a gravar a reação", { error: error.message });
          else log("reação recebida", { mid: reac.mid, emoji: reac.emoji, action: reac.action });
          continue;
        }

        // Que caixa é esta? No Instagram o `entry.id` é o id da CONTA
        // (ig_account_id); no Messenger é o id da PÁGINA. Procuram-se os dois.
        //
        // Isto era um `.or("metadata->>page_id.eq.X,metadata->>ig_account_id.eq.X")`
        // — e falhava em silêncio. O erro do PostgREST nem era verificado, por
        // isso o canal vinha nulo, o evento era descartado como "página que não
        // temos ligada", e ficava uma mensagem real perdida sem rasto. Duas
        // consultas simples são mais feias e funcionam.
        const findChannel = async (col: "ig_account_id" | "page_id") => {
          const { data, error } = await supabase
            .from("messaging_channels")
            .select("id, organization_id, channel_type, metadata")
            .eq(`metadata->>${col}`, pageId)
            .limit(1)
            .maybeSingle();
          if (error) logError(`procura de canal por ${col} falhou`, { error: error.message });
          return data;
        };

        const channel = await findChannel("ig_account_id") ?? await findChannel("page_id");

        if (!channel) {
          log("evento para uma página que não temos ligada", { pageId });
          continue;
        }

        const text = ev.message?.text ?? "";
        const attachments = (ev.message?.attachments ?? []).map((a) => ({
          type: a.type ?? "file",
          url: a.payload?.url ?? null,
        }));
        if (!text && attachments.length === 0) continue;

        const at = ev.timestamp ? new Date(ev.timestamp) : new Date();

        // Conversa: cria na primeira mensagem, atualiza nas seguintes.
        const { data: conv, error: convErr } = await supabase
          .from("meta_conversations")
          .upsert({
            organization_id: channel.organization_id,
            channel_id: channel.id,
            contact_ref: senderId,
            last_message: text || `[${attachments[0]?.type ?? "anexo"}]`,
            last_message_at: at.toISOString(),
            // Cada mensagem da pessoa reabre a janela de 24 horas.
            window_expires_at: new Date(at.getTime() + REPLY_WINDOW_MS).toISOString(),
            status: "open",
            updated_at: new Date().toISOString(),
          }, { onConflict: "channel_id,contact_ref" })
          .select("id, contact_name")
          .single();

        if (convErr || !conv) {
          logError("falha a gravar a conversa", { error: convErr?.message });
          continue;
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
          const pageToken = (channel.metadata as { page_access_token?: string } | null)?.page_access_token;
          if (pageToken) {
            try {
              const profRes = await fetch(
                `https://graph.facebook.com/v21.0/${senderId}`
                + `?fields=name,username,profile_pic&access_token=${encodeURIComponent(pageToken)}`,
              );
              const prof = await profRes.json();
              if (profRes.ok && !prof?.error) {
                await supabase.from("meta_conversations").update({
                  contact_name: prof.username ? `@${prof.username}` : (prof.name ?? null),
                  // Atenção: este endereço é assinado e EXPIRA. Guarda-se para
                  // ter foto já; quando deixar de abrir, basta limpar o nome
                  // que o próximo webhook volta a pedir os dois.
                  contact_avatar_url: prof.profile_pic ?? null,
                }).eq("id", conv.id);
                log("perfil obtido", { senderId, username: prof.username ?? prof.name });
              } else {
                // Acontece: contas com restrições de privacidade não expõem o
                // perfil. A conversa funciona à mesma, só sem nome.
                log("perfil indisponível", { senderId, erro: prof?.error?.message });
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
        });

        // 23505 = já existe. Os webhooks são entregues pelo menos uma vez, por
        // isso repetições são NORMAIS — o índice único faz o seu trabalho e não
        // há nada a assinalar.
        if (msgErr && (msgErr as { code?: string }).code !== "23505") {
          logError("falha a gravar a mensagem", { error: msgErr.message });
          continue;
        }

        if (!msgErr) {
          await supabase.rpc("increment_meta_unread", { _conversation_id: conv.id })
            .then(() => {}, () => {
              // Sem a função, o contador fica na mesma — a mensagem é o que
              // importa e já está guardada.
            });
          log("mensagem guardada", { canal: channel.channel_type, conversa: conv.id });
        }
      }
    }
  } catch (e) {
    logError("erro a processar", { error: (e as Error).message });
  }

  return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
});
