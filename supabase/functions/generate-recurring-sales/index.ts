// Gera os ciclos vencidos das recorrências manuais.
//
// Uma recorrência manual não tem ninguém do lado de fora a lembrar-se dela: sem
// este cron, a venda diz "renova a 30 de agosto" e no dia 30 não acontece nada —
// nenhum ciclo é criado, nada aparece por liquidar no financeiro, e o dinheiro
// simplesmente não é cobrado a ninguém. Era este o buraco.
//
// As recorrências Stripe NÃO passam por aqui: nessas, quem cria o ciclo é a
// fatura que chega por webhook. Gerar ciclos dos dois lados criaria duplicados
// para a mesma competência.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const log = (step: string, details?: Record<string, unknown>) => {
  console.log(`[GENERATE-RECURRING-SALES] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

/** Mesma convenção dos outros crons financeiros: segredo no Vault, falha fechada. */
async function isAuthorized(req: Request, supabase: SupabaseClient): Promise<boolean> {
  const provided = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("key");
  if (!provided) return false;

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && provided === cronSecret) return true;

  const { data, error } = await supabase.rpc("verify_stripe_cron_secret", { p_secret: provided });
  if (error) {
    log("verificação de autorização falhou", { message: error.message });
    return false;
  }
  return data === true;
}

interface DueRecurrence {
  id: string;
  organization_id: string;
  next_cycle_date: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  if (!(await isAuthorized(req, supabase))) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Só serviço activo e cobrança manual. Uma recorrência pausada ou cancelada
  // não deve gerar dívida nova, e as Stripe são geridas pelas próprias facturas.
  const { data: due, error } = await supabase
    .from("sale_recurrences")
    .select("id, organization_id, next_cycle_date")
    .eq("service_status", "active")
    .eq("billing_provider", "manual")
    .not("next_cycle_date", "is", null)
    .lte("next_cycle_date", today)
    .limit(500);

  if (error) {
    log("falha a listar recorrências", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = (due ?? []) as DueRecurrence[];
  let created = 0;
  let skipped = 0;
  const failures: Array<{ recurrenceId: string; message: string }> = [];

  for (const recurrence of rows) {
    // Uma recorrência esquecida há meses tem várias competências em falta. O
    // ciclo interno avança mês a mês até apanhar o presente, em vez de criar um
    // só e deixar os meses intermédios por cobrar para sempre.
    let guard = 0;
    let cursor = recurrence.next_cycle_date;

    while (cursor <= today && guard < 24) {
      guard += 1;
      const { error: rpcError } = await supabase.rpc("create_recurring_cycle", {
        p_recurrence_id: recurrence.id,
        p_period_start: cursor,
      });

      if (rpcError) {
        // 23505 = o ciclo desta competência já existe. É o resultado normal de
        // uma segunda passagem do cron no mesmo dia, não um erro.
        if (rpcError.code === "23505") {
          skipped += 1;
        } else {
          failures.push({ recurrenceId: recurrence.id, message: rpcError.message });
          break;
        }
      } else {
        created += 1;
      }

      // Relê a data seguinte decidida pela função: é ela que conhece as regras
      // de âncora (dia 31 em meses de 30, etc.), não este ciclo.
      const { data: refreshed } = await supabase
        .from("sale_recurrences")
        .select("next_cycle_date")
        .eq("id", recurrence.id)
        .maybeSingle<{ next_cycle_date: string | null }>();

      const next = refreshed?.next_cycle_date;
      if (!next || next <= cursor) break;
      cursor = next;
    }
  }

  log("concluído", { candidatas: rows.length, created, skipped, falhas: failures.length });

  return new Response(
    JSON.stringify({ candidates: rows.length, created, skipped, failures }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
