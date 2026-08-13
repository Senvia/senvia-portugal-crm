// Stripe Connect (OAuth Standard) por organização.
//
// Cada organização liga a SUA conta Stripe. O dinheiro dos clientes dela entra
// na conta dela; nós nunca lhe tocamos. É por isso que isto é Connect Standard
// e não uma chave partilhada.
//
// verify_jwt fica desligado no config.toml porque o `callback` é uma navegação
// do browser vinda do Stripe, sem cabeçalho Authorization. Consequência: a
// autenticação das restantes acções é feita AQUI dentro, explicitamente. Não há
// rede de segurança do gateway — se esta função esquecer a verificação, a acção
// fica aberta ao mundo.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  serviceClient,
  stripeClient,
  modeFromSecretKey,
  toSummary,
  sha256Hex,
  NOT_CONNECTED,
  type StripeConnectionRow,
} from "../_shared/stripe-connect.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_BASE = "https://app.senvia.pt";
const STATE_TTL_MINUTES = 15;

const log = (step: string, details?: Record<string, unknown>) => {
  console.log(`[STRIPE-CONNECT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** O callback termina sempre no CRM, com o resultado no query string. */
function redirectToApp(outcome: "connected" | "error", reason?: string): Response {
  const url = new URL(`${APP_BASE}/settings`);
  url.searchParams.set("stripe", outcome);
  if (reason) url.searchParams.set("stripe_reason", reason);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

interface Caller {
  userId: string;
  organizationId: string;
}

/**
 * Identifica quem chama e confirma que pertence à organização pedida.
 *
 * O organization_id vem do corpo do pedido, por isso NUNCA pode ser aceite tal
 * como vem: sem esta verificação, um membro de uma organização ligava ou
 * desligava o Stripe de outra qualquer, bastando trocar o id no pedido.
 */
async function authenticate(
  req: Request,
  organizationId: string,
  requireAdmin: boolean,
): Promise<Caller | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return json({ error: "Não autenticado" }, 401);

  const supabase = serviceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ error: "Não autenticado" }, 401);

  const rpc = requireAdmin ? "is_org_admin" : "is_org_member";
  const { data: allowed, error: roleError } = await supabase.rpc(rpc, {
    _user_id: user.id,
    _org_id: organizationId,
  });
  if (roleError || allowed !== true) {
    return json({ error: requireAdmin ? "Apenas administradores" : "Sem acesso" }, 403);
  }

  return { userId: user.id, organizationId };
}

async function readConnection(organizationId: string): Promise<StripeConnectionRow | null> {
  const { data } = await serviceClient()
    .from("stripe_connections")
    .select(
      "id, organization_id, stripe_account_id, mode, status, charges_enabled, details_submitted, connected_at, disconnected_at, last_error",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as StripeConnectionRow | null) ?? null;
}

async function handleAuthorize(organizationId: string, userId: string): Promise<Response> {
  const clientId = Deno.env.get("STRIPE_CONNECT_CLIENT_ID");
  if (!clientId) {
    log("STRIPE_CONNECT_CLIENT_ID em falta");
    return json({ error: "Integração Stripe não configurada no servidor" }, 500);
  }

  // O state em claro só existe aqui e no browser do utilizador; a base de dados
  // guarda apenas o digest.
  const state = crypto.randomUUID() + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + STATE_TTL_MINUTES * 60_000).toISOString();

  const { error } = await serviceClient().from("stripe_oauth_states").insert({
    state_hash: await sha256Hex(state),
    organization_id: organizationId,
    user_id: userId,
    mode: modeFromSecretKey(),
    expires_at: expiresAt,
  });
  if (error) {
    log("falha a gravar state", { message: error.message });
    return json({ error: "Não foi possível iniciar a ligação" }, 500);
  }

  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "read_write");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", `${Deno.env.get("SUPABASE_URL")}/functions/v1/stripe-connect`);

  return json({ url: url.toString() });
}

async function handleCallback(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");

  if (params.get("error")) return redirectToApp("error", params.get("error") ?? "recusado");
  if (!code || !state) return redirectToApp("error", "pedido_incompleto");

  const supabase = serviceClient();
  // Consumo atómico: se este state já foi usado (ou expirou), não volta nada.
  const { data: consumed, error: consumeError } = await supabase.rpc("consume_stripe_oauth_state", {
    _state_hash: await sha256Hex(state),
  });
  const claim = Array.isArray(consumed) ? consumed[0] : null;
  if (consumeError || !claim) {
    log("state inválido ou reutilizado");
    return redirectToApp("error", "estado_invalido");
  }

  try {
    const stripe = stripeClient();
    const token = await stripe.oauth.token({ grant_type: "authorization_code", code });
    const accountId = token.stripe_user_id;
    if (!accountId) return redirectToApp("error", "conta_nao_devolvida");

    const account = await stripe.accounts.retrieve(accountId);
    const restricted = !account.charges_enabled || !account.details_submitted;

    // onConflict na organização: religar substitui a ligação anterior em vez de
    // criar uma segunda linha — a constraint unique(organization_id) garante-o.
    const { error } = await supabase.from("stripe_connections").upsert(
      {
        organization_id: claim.organization_id,
        stripe_account_id: accountId,
        mode: claim.mode,
        status: restricted ? "restricted" : "active",
        charges_enabled: account.charges_enabled ?? false,
        details_submitted: account.details_submitted ?? false,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );
    if (error) {
      log("falha a gravar ligação", { message: error.message });
      return redirectToApp("error", "gravacao_falhou");
    }

    log("ligado", { organizationId: claim.organization_id, mode: claim.mode });
    return redirectToApp("connected");
  } catch (err) {
    log("troca de token falhou", { message: err instanceof Error ? err.message : "desconhecido" });
    return redirectToApp("error", "troca_falhou");
  }
}

async function handleDisconnect(organizationId: string): Promise<Response> {
  const connection = await readConnection(organizationId);
  if (!connection || connection.status === "disconnected") return json({ connection: NOT_CONNECTED });

  const clientId = Deno.env.get("STRIPE_CONNECT_CLIENT_ID");
  try {
    if (clientId) {
      await stripeClient().oauth.deauthorize({
        client_id: clientId,
        stripe_user_id: connection.stripe_account_id,
      });
    }
  } catch (err) {
    // Se o Stripe já não reconhece a ligação, o objectivo local — deixar de a
    // usar — continua válido. Marcamos como desligada na mesma.
    log("deauthorize falhou (a desligar localmente na mesma)", {
      message: err instanceof Error ? err.message : "desconhecido",
    });
  }

  // Preserva o histórico: marca desligada em vez de apagar a linha.
  await serviceClient()
    .from("stripe_connections")
    .update({
      status: "disconnected",
      disconnected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId);

  return json({ connection: NOT_CONNECTED });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // O Stripe devolve o utilizador aqui por GET, sem autenticação nossa.
  if (req.method === "GET") return handleCallback(req);

  try {
    const body = (await req.json()) as { action?: string; organizationId?: string };
    const action = body.action ?? "";
    const organizationId = body.organizationId ?? "";
    if (!organizationId) return json({ error: "organizationId em falta" }, 400);

    const needsAdmin = action === "authorize" || action === "disconnect";
    const caller = await authenticate(req, organizationId, needsAdmin);
    if (caller instanceof Response) return caller;

    if (action === "status") return json({ connection: toSummary(await readConnection(organizationId)) });
    if (action === "authorize") return handleAuthorize(organizationId, caller.userId);
    if (action === "disconnect") return handleDisconnect(organizationId);
    return json({ error: "Acção desconhecida" }, 400);
  } catch (err) {
    log("erro", { message: err instanceof Error ? err.message : "desconhecido" });
    return json({ error: "Erro inesperado" }, 500);
  }
});
