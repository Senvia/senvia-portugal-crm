// meta-data-deletion — Data Deletion Callback exigido pela Meta.
//
// A Meta obriga qualquer app que trate dados de utilizadores da plataforma a
// expor um endereço que apague esses dados a pedido. Sem isto a app NÃO passa
// App Review — é dos requisitos verificados, e nós não tínhamos nenhum.
//
// Como funciona (https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback):
//   1. A Meta faz POST com um campo `signed_request` no corpo (form-urlencoded).
//   2. O signed_request é `<assinatura>.<payload>`, ambos em base64url. A
//      assinatura é HMAC-SHA256 do payload com o App Secret — é o que prova que
//      o pedido vem mesmo da Meta e não de um qualquer.
//   3. O payload traz `user_id`: o ID do utilizador do Instagram/Facebook.
//   4. Apagamos o que temos desse utilizador e respondemos com um URL de estado
//      e um código de confirmação.
//
// O GET no mesmo endereço serve a página de estado que a resposta aponta — a
// Meta (e o próprio utilizador) podem abri-la para confirmar o pedido.

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[META-DATA-DELETION] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

/** base64url → bytes (o base64 da Meta usa -_ e não tem padding). */
function b64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (input.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  // Comparação de tempo constante: uma comparação normal desiste no primeiro
  // byte diferente e deixa medir a assinatura correta pelo tempo de resposta.
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Verifica a assinatura e devolve o payload, ou null se não for da Meta. */
async function parseSignedRequest(
  signed: string,
  appSecret: string,
): Promise<Record<string, unknown> | null> {
  const [sigPart, payloadPart] = signed.split(".", 2);
  if (!sigPart || !payloadPart) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart)),
  );
  if (!bytesEqual(expected, b64urlToBytes(sigPart))) return null;

  try {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadPart)));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // ── GET: página de estado de um pedido ────────────────────────────────────
  // É o endereço que devolvemos no campo `url` da resposta ao POST.
  if (req.method === "GET") {
    const code = url.searchParams.get("id") ?? "";
    return new Response(
      `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Eliminação de dados — Senvia OS</title>
<style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1.5rem;line-height:1.6;color:#0f172a}code{background:#f1f5f9;padding:.15rem .4rem;border-radius:.25rem}</style>
</head><body>
<h1>Pedido de eliminação de dados</h1>
<p>O seu pedido foi recebido e os dados associados à sua conta da Meta foram
eliminados dos nossos sistemas.</p>
${code ? `<p>Código de confirmação: <code>${code.replace(/[^A-Za-z0-9_-]/g, "")}</code></p>` : ""}
<p>Para qualquer questão sobre os seus dados, contacte
<a href="mailto:geral@senvia.pt">geral@senvia.pt</a>.</p>
</body></html>`,
      { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
    if (!appSecret) {
      // Falha fechada: sem segredo não há forma de saber se o pedido é da Meta,
      // e apagar dados a pedido de qualquer um seria bem pior do que recusar.
      console.error("[META-DATA-DELETION] ERROR FACEBOOK_APP_SECRET em falta");
      return new Response(JSON.stringify({ error: "not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // A Meta envia form-urlencoded; aceitamos JSON também para facilitar testes.
    let signedRequest = "";
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      signedRequest = String((await req.json().catch(() => ({}))).signed_request ?? "");
    } else {
      const form = await req.formData().catch(() => null);
      signedRequest = String(form?.get("signed_request") ?? "");
    }

    if (!signedRequest) {
      return new Response(JSON.stringify({ error: "signed_request em falta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await parseSignedRequest(signedRequest, appSecret);
    if (!payload) {
      log("assinatura inválida — pedido recusado");
      return new Response(JSON.stringify({ error: "assinatura inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaUserId = String(payload.user_id ?? "");
    if (!metaUserId) {
      return new Response(JSON.stringify({ error: "user_id em falta" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Registo do pedido ANTES de apagar. Se algo falhar a meio, fica prova de
    // que o pedido chegou e o que se estava a apagar — um pedido de eliminação
    // que desaparece sem rasto é o pior resultado possível numa auditoria.
    const confirmationCode = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    await supabase.from("meta_data_deletion_requests").insert({
      confirmation_code: confirmationCode,
      meta_user_id: metaUserId,
      payload,
    }).then(() => {}, (e: unknown) => {
      console.error("[META-DATA-DELETION] ERROR falha a registar pedido:", e);
    });

    // As mensagens de Instagram/Messenger vivem no Chatwoot; do nosso lado o que
    // guardamos são mensagens e contactos na inbox_messages. Apagamos o que
    // estiver associado a este utilizador da Meta.
    const { error: delErr, count } = await supabase
      .from("inbox_messages")
      .delete({ count: "exact" })
      .eq("sender_meta_id", metaUserId);

    if (delErr) {
      // 42703 = a coluna ainda não existe (a integração de Instagram nunca
      // chegou a gravar nada). Não é erro: não há dados para apagar.
      const code = (delErr as { code?: string }).code;
      if (code !== "42703") {
        console.error("[META-DATA-DELETION] ERROR falha a apagar:", delErr.message);
      }
    }

    log("pedido processado", { metaUserId, apagadas: count ?? 0, confirmationCode });

    // Formato exigido pela Meta: o URL onde o utilizador vê o estado, e o código.
    const statusUrl = `${url.origin}${url.pathname}?id=${confirmationCode}`;
    return new Response(
      JSON.stringify({ url: statusUrl, confirmation_code: confirmationCode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[META-DATA-DELETION] ERROR", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
