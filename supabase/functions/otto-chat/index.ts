// otto-chat — proxy para a função `otto`.
//
// Isto era o Otto legacy: 1113 linhas com o Gemini embutido, ferramentas
// próprias e o seu próprio prompt de identidade. Foi substituído pelo `otto`,
// que tem a cabeça no agente OpenClaw, ferramentas por registo e permissões
// por módulo.
//
// Porquê um proxy em vez de apagar a função: clientes antigos, a extensão do
// Chrome e qualquer separador que não tenha recarregado continuam a chamar
// este endereço. Apagá-lo dava-lhes um 404 sem explicação. Reencaminhar mantém
// tudo a funcionar e garante o que mais importava — que existe UM só Otto, com
// uma identidade só. Dois Ottos a responder na mesma organização, cada um com o
// seu prompt e a sua memória, era precisamente o resultado a evitar.
//
// O contrato de entrada é o mesmo dos dois lados (messages, organization_id,
// attachment_paths), por isso o corpo passa tal e qual.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const target = `${Deno.env.get("SUPABASE_URL")}/functions/v1/otto`;

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Leva a identidade de quem chamou. Sem este cabeçalho o `otto` via um
        // pedido anónimo, não conseguia derivar a organização, e recusava o
        // acesso aos dados — o utilizador teria um Otto sem memória nem dados.
        Authorization: req.headers.get("Authorization") ?? "",
        apikey: req.headers.get("apikey") ?? "",
      },
      body: await req.text(),
    });

    // O `otto` responde em SSE quando faz streaming. Devolver o corpo
    // directamente preserva-o; lê-lo para uma string aqui fazia a resposta
    // chegar toda de uma vez no fim, e o chat deixava de escrever à medida que
    // o Otto pensa.
    const headers = new Headers(corsHeaders);
    const contentType = upstream.headers.get("Content-Type");
    if (contentType) headers.set("Content-Type", contentType);
    for (const key of ["x-otto-provider", "x-otto-model"]) {
      const value = upstream.headers.get(key);
      if (value) headers.set(key, value);
    }

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error("[OTTO-CHAT-PROXY] falha a reencaminhar", error);
    return new Response(
      JSON.stringify({ error: "Otto indisponível de momento." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
