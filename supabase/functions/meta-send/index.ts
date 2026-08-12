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

    const { conversation_id, text } = await req.json().catch(() => ({}));
    if (!conversation_id || !String(text ?? "").trim()) {
      return json({ error: "conversation_id e text são obrigatórios" }, 400);
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
    if (conv.window_expires_at && new Date(conv.window_expires_at) < new Date()) {
      return json({
        error: "Passaram mais de 24 horas desde a última mensagem desta pessoa. "
          + "A Meta só permite responder dentro desse prazo — só é possível "
          + "voltar a escrever depois de ela enviar nova mensagem.",
        code: "window_expired",
      }, 409);
    }

    const { data: channel } = await admin
      .from("messaging_channels")
      .select("metadata, channel_type")
      .eq("id", conv.channel_id)
      .maybeSingle();
    const meta = (channel?.metadata ?? {}) as { page_id?: string; page_access_token?: string };
    if (!meta.page_id || !meta.page_access_token) {
      return json({ error: "Canal sem credenciais — volta a ligar a conta." }, 400);
    }

    const res = await fetch(`${GRAPH}/${meta.page_id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: conv.contact_ref },
        message: { text: String(text) },
        messaging_type: "RESPONSE",
        access_token: meta.page_access_token,
      }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || body?.error) {
      logError("a Meta recusou o envio", { status: res.status, body });
      return json({
        error: body?.error?.message ?? `A Meta recusou o envio (${res.status})`,
      }, 502);
    }

    // Guarda a mensagem enviada, para aparecer na conversa como qualquer outra.
    await admin.from("meta_messages").insert({
      organization_id: conv.organization_id,
      conversation_id: conv.id,
      external_id: body?.message_id ?? null,
      direction: "outgoing",
      content: String(text),
      sent_by: user.id,
    });

    await admin.from("meta_conversations").update({
      last_message: String(text),
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", conv.id);

    log("mensagem enviada", { conversa: conv.id, canal: channel?.channel_type });
    return json({ success: true, message_id: body?.message_id ?? null });
  } catch (e) {
    logError("erro inesperado", { error: (e as Error).message });
    return json({ error: (e as Error).message }, 500);
  }
});
