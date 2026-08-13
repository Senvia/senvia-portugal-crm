// Resolução da conta Stripe ligada de uma organização.
//
// Regra que atravessa todo o domínio recorrente: a associação ao Stripe é feita
// por IDs (organization_id, stripe_account_id) e nunca por e-mail, nome ou
// "a primeira venda encontrada". Duas organizações podem ter o mesmo e-mail de
// contacto, e um cliente pode mudar de nome — associar por esses campos leva a
// dinheiro creditado à organização errada, que é irreversível na prática.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

export type StripeMode = "test" | "live";

export type StripeConnectionStatus = "active" | "restricted" | "disconnected" | "error";

export interface StripeConnectionRow {
  id: string;
  organization_id: string;
  stripe_account_id: string;
  mode: StripeMode;
  status: StripeConnectionStatus;
  charges_enabled: boolean;
  details_submitted: boolean;
  connected_at: string;
  disconnected_at: string | null;
  last_error: string | null;
}

/** O que o frontend pode ver. Nunca inclui tokens nem segredos. */
export interface StripeConnectionSummary {
  connected: boolean;
  status: StripeConnectionStatus | "not_connected";
  mode: StripeMode | null;
  /** `acct_1A…4Zx` — suficiente para o utilizador reconhecer a conta, sem a expor toda. */
  accountMasked: string | null;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  connectedAt: string | null;
  lastError: string | null;
}

export const NOT_CONNECTED: StripeConnectionSummary = {
  connected: false,
  status: "not_connected",
  mode: null,
  accountMasked: null,
  chargesEnabled: false,
  detailsSubmitted: false,
  connectedAt: null,
  lastError: null,
};

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

export function stripeClient(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2025-08-27.basil" });
}

/**
 * O modo vem da chave secreta, não de configuração nossa.
 *
 * Se guardássemos o modo à parte, uma troca de chave de test para live deixava
 * as ligações antigas a dizer "test" enquanto cobravam dinheiro a sério. A chave
 * é a única fonte de verdade sobre em que ambiente estamos.
 */
export function modeFromSecretKey(): StripeMode {
  const key = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  return key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "live" : "test";
}

export function maskAccount(accountId: string): string {
  if (accountId.length <= 12) return accountId;
  return `${accountId.slice(0, 9)}…${accountId.slice(-4)}`;
}

export function toSummary(row: StripeConnectionRow | null): StripeConnectionSummary {
  if (!row || row.status === "disconnected") return NOT_CONNECTED;
  return {
    connected: row.status === "active" || row.status === "restricted",
    status: row.status,
    mode: row.mode,
    accountMasked: maskAccount(row.stripe_account_id),
    chargesEnabled: row.charges_enabled,
    detailsSubmitted: row.details_submitted,
    connectedAt: row.connected_at,
    lastError: row.last_error,
  };
}

export interface ConnectedStripeContext {
  stripeAccountId: string;
  mode: StripeMode;
  connectionId: string;
}

/**
 * Contexto da conta ligada, ou null.
 *
 * Devolve null para ligações que não estejam activas ou restritas — e o modo tem
 * de coincidir com o da chave em uso. Uma ligação criada em test não pode ser
 * usada com uma chave live: as contas nem existem no outro ambiente, e a chamada
 * falharia de forma obscura em vez de recusar aqui, com motivo.
 */
export async function getConnectedStripeContext(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ConnectedStripeContext | null> {
  const { data, error } = await supabase
    .from("stripe_connections")
    .select("id, stripe_account_id, mode, status")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.status !== "active" && data.status !== "restricted") return null;
  if (data.mode !== modeFromSecretKey()) return null;

  return {
    stripeAccountId: data.stripe_account_id,
    mode: data.mode,
    connectionId: data.id,
  };
}

/** SHA-256 em hexadecimal. A tabela guarda só isto, nunca o state em claro. */
export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
