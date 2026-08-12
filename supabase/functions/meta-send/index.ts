// meta-send — responde a uma conversa de Instagram ou Messenger.
//
// O envio tem de ser no servidor: o token da Página nunca pode chegar ao
// browser. Quem o tiver pode ler e enviar mensagens em nome da empresa.
//
// A janela das 24 horas é verificada ANTES de tentar. A Meta recusa envios fora
// dela com um erro genérico (#10 / "outside allowed window") que não diz o que
// realmente se passa; vale mais devolver uma frase que se entende.

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH = "https://graph.facebook.com/v21.0";

const log = (s: string, d?: unknown) =>
  console.log(`[META-SEND] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);
const logError = (s: string, d?: unknown) =>
  console.error(`[META-SEND] ERROR ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    if (!bearer) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Quem está a enviar. Sem isto qualquer pessoa com o endereço podia
    // responder em nome da empresa.
    const { data: { user } } = await admin.auth.getUser(bearer);
    if (!user) return json({ error: "Sessão inválida" }, 401);

    const {
      conversation_id, text,
      // Anexo por URL (a Meta vai buscá-lo, por isso tem de ser público).
      attachment_url, attachment_type,
      // "react" / "unreact" / "typing_on" / "typing_off" / "mark_seen"
      action, message_external_id, reaction,
      // Responder A uma mensagem concreta (o `mid` dela, do lado da Meta).
      reply_to_mid,
    } = await req.json().catch(() => ({}));

    const temTexto = !!String(text ?? "").trim();
    if (!conversation_id) return json({ error: "conversation_id é obrigatório" }, 400);
    if (!temTexto && !attachment_url && !action) {
      return json({ error: "Nada para enviar" }, 400);
    }
    // Limite da Meta: 1000 bytes, não 1000 caracteres — acentos contam a dobrar.
    if (temTexto && new TextEncoder().encode(String(text)).length > 1000) {
      return json({
        error: "A mensagem excede o limite de 1000 bytes do Instagram. Divide-a em duas.",
      }, 400);
    }

    const { data: conv } = await admin
      .from("meta_conversations")
      .select("id, organization_id, channel_id, contact_ref, window_expires_at")
      .eq("id", conversation_id)
      .maybeSingle();
    if (!conv) return json({ error: "Conversa não encontrada" }, 404);

    // Membro da organização da conversa? O RLS protege as leituras do cliente,
    // mas aqui corremos como service_role — a verificação é nossa.
    //
    // O parâmetro chama-se `_org_id` (não `_organization_id`): com o nome errado
    // o Postgres não encontra a função, o `data` vem nulo, e a resposta seria um
    // "Sem acesso a esta conversa" a toda a gente — um 403 a mentir sobre a causa.
    const { data: isMember, error: memberErr } = await admin.rpc("is_org_member", {
      _user_id: user.id, _org_id: conv.organization_id,
    });
    if (memberErr) {
      logError("verificação de membro falhou", { error: memberErr.message });
      return json({ error: "Não foi possível verificar o acesso" }, 500);
    }
    if (!isMember) return json({ error: "Sem acesso a esta conversa" }, 403);

    // A janela das 24h. Verificada aqui para dar uma resposta que se entende.
    // As ações de sinalização (a escrever, visto) não contam como mensagem, por
    // isso não são bloqueadas por ela.
    const acaoSinal = action === "typing_on" || action === "typing_off" || action === "mark_seen";
    if (!acaoSinal && conv.window_expires_at && new Date(conv.window_expires_at) < new Date()) {
      return json({
        error: "Passaram mais de 24 horas desde a última mensagem desta pessoa. "
          + "A Meta só permite responder dentro desse prazo — só é possível "
          + "voltar a escrever depois de ela enviar nova mensagem.",
        code: "window_expired",
      }, 409);
    }

    // O canal TEM de pertencer à mesma organização da conversa. Sem este filtro,
    // um membro podia alterar o channel_id da sua conversa (o RLS só verifica o
    // organization_id) e passar a enviar pela Página de outra organização.
    const { data: channel } = await admin
      .from("messaging_channels")
      .select("metadata, channel_type")
      .eq("id", conv.channel_id)
      .eq("organization_id", conv.organization_id)
      .maybeSingle();
    // O token vive fora do metadata: aquela tabela é legível por qualquer membro.
    const { data: secret } = await admin
      .from("messaging_channel_secrets")
      .select("page_access_token")
      .eq("channel_id", conv.channel_id)
      .maybeSingle();
    const meta = (channel?.metadata ?? {}) as { page_id?: string };
    const pageToken = secret?.page_access_token;
    if (!meta.page_id || !pageToken) {
      return json({ error: "Canal sem credenciais — volta a ligar a conta." }, 400);
    }

    // O corpo muda conforme o que se está a fazer. Texto e anexo NÃO podem ir
    // na mesma mensagem — é limitação da Meta, não escolha nossa.
    let payload: Record<string, unknown>;
    if (acaoSinal) {
      payload = { recipient: { id: conv.contact_ref }, sender_action: action };
    } else if (action === "react" || action === "unreact") {
      if (!message_external_id) return json({ error: "message_external_id em falta" }, 400);
      payload = {
        recipient: { id: conv.contact_ref },
        sender_action: action,
        payload: action === "react"
          ? { message_id: message_external_id, reaction: reaction || "❤️" }
          : { message_id: message_external_id },
      };
    } else if (attachment_url) {
      payload = {
        recipient: { id: conv.contact_ref },
        message: {
          attachment: {
            type: attachment_type || "file",
            payload: { url: attachment_url },
          },
          ...(reply_to_mid ? { reply_to: { mid: reply_to_mid } } : {}),
        },
        messaging_type: "RESPONSE",
      };
    } else {
      payload = {
        recipient: { id: conv.contact_ref },
        message: {
          text: String(text),
          ...(reply_to_mid ? { reply_to: { mid: reply_to_mid } } : {}),
        },
        messaging_type: "RESPONSE",
      };
    }

    const res = await fetch(`${GRAPH}/${meta.page_id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, access_token: pageToken }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || body?.error) {
      logError("a Meta recusou o envio", { status: res.status, body });
      return json({
        error: body?.error?.message ?? `A Meta recusou o envio (${res.status})`,
      }, 502);
    }

    // Sinalizações (a escrever / visto) não são mensagens: não se guardam nem
    // mexem na conversa. Gravá-las poluiria a thread com linhas vazias.
    if (acaoSinal) {
      return json({ success: true });
    }

    // Reações não são mensagens novas — anotam-se na mensagem reagida.
    if (action === "react" || action === "unreact") {
      await admin.from("meta_messages")
        .update({
          reaction: action === "react" ? (reaction || "❤️") : null,
          reaction_by: action === "react" ? "agent" : null,
        })
        .eq("conversation_id", conv.id)
        .eq("external_id", message_external_id);
      log("reação registada", { conversa: conv.id, action });
      return json({ success: true });
    }

    const resumo = temTexto
      ? String(text)
      : `[${attachment_type || "anexo"}]`;

    // Guarda a mensagem enviada, para aparecer na conversa como qualquer outra.
    //
    // O erro deste insert É verificado. Neste ponto a Meta já entregou a
    // mensagem ao cliente: se a gravação falhar em silêncio, respondemos
    // `success` ao CRM, o rascunho é limpo, e fica uma mensagem que o cliente
    // recebeu e que não existe em lado nenhum do sistema — o agente reescreve-a.
    const { error: insertErr } = await admin.from("meta_messages").insert({
      organization_id: conv.organization_id,
      conversation_id: conv.id,
      external_id: body?.message_id ?? null,
      direction: "outgoing",
      content: temTexto ? String(text) : null,
      reply_to_external_id: reply_to_mid ?? null,
      attachments: attachment_url
        ? [{ type: attachment_type || "file", url: attachment_url }]
        : [],
      sent_by: user.id,
      sent_at: new Date().toISOString(),
    });

    if (insertErr) {
      logError("ENTREGUE MAS NÃO GUARDADA", {
        conversa: conv.id, message_id: body?.message_id, error: insertErr.message,
      });
    }

    const { error: convErr } = await admin.from("meta_conversations").update({
      last_message: resumo,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", conv.id);
    if (convErr) logError("falha a atualizar a conversa", { error: convErr.message });

    log("mensagem enviada", { conversa: conv.id, canal: channel?.channel_type });
    // `stored: false` diz ao CRM que a mensagem foi mesmo entregue mas não ficou
    // registada — é a diferença entre "reenvia" e "não reenvies, já foi".
    return json({ success: true, stored: !insertErr, message_id: body?.message_id ?? null });
  } catch (e) {
    logError("erro inesperado", { error: (e as Error).message });
    return json({ error: (e as Error).message }, 500);
  }
});
