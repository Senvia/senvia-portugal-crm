// Shared helpers for the Multicanal feature (WhatsApp via Evolution + Chatwoot).
// Used by the whatsapp-connect and whatsapp-status edge functions.
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export interface MulticanalConfig {
  evolutionUrl: string;
  evolutionKey: string;
  chatwootUrl: string;
  chatwootPlatformToken: string;
  supabaseUrl: string;
  serviceKey: string;
  anonKey: string;
}

export function getConfig(): MulticanalConfig {
  const evolutionUrl = (Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY') || '';
  const chatwootUrl = (Deno.env.get('CHATWOOT_URL') || '').replace(/\/$/, '');
  const chatwootPlatformToken = Deno.env.get('CHATWOOT_PLATFORM_TOKEN') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  return { evolutionUrl, evolutionKey, chatwootUrl, chatwootPlatformToken, supabaseUrl, serviceKey, anonKey };
}

// Deterministic Evolution instance name for an organization.
// Legacy single-channel name (the org's first/original WhatsApp instance).
export function instanceNameForOrg(orgId: string): string {
  return `senvia-${orgId.slice(0, 8)}`;
}

// Per-channel Evolution instance name, for multi-account support. Existing rows
// keep their stored evolution_instance (often the legacy name above); only NEW
// channels get a per-channel suffix so multiple WhatsApp numbers don't collide.
export function instanceNameForChannel(orgId: string, channelId: string): string {
  return `senvia-${orgId.slice(0, 8)}-${channelId.slice(0, 8)}`;
}

// Find a Chatwoot inbox id by name within an account. Used after the Evolution
// integration auto-creates the inbox, so we can persist chatwoot_inbox_id and
// route sends/webhooks per inbox. Returns null if not found.
export async function findChatwootInboxByName(
  cfg: MulticanalConfig,
  accountId: number,
  token: string,
  name: string,
): Promise<number | null> {
  try {
    const res = await chatwootFetch(cfg, token, `/api/v1/accounts/${accountId}/inboxes`);
    if (!res.ok) return null;
    const body = await res.json();
    const list = Array.isArray(body?.payload) ? body.payload : (Array.isArray(body) ? body : []);
    const match = list.find((i: { name?: string }) => (i?.name || '').trim() === name.trim());
    return match?.id ?? null;
  } catch (_e) {
    return null;
  }
}

// Validate that the caller is an active admin of the given organization.
// Returns the service-role client + userId on success, or a Response error.
export async function authOrgAdmin(
  req: Request,
  cfg: MulticanalConfig,
  organizationId: string,
): Promise<{ admin: SupabaseClient; userId: string } | { error: Response }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { error: json({ error: 'Não autorizado' }, 401) };
  if (!organizationId) return { error: json({ error: 'organization_id em falta' }, 400) };

  const userClient = createClient(cfg.supabaseUrl, cfg.anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return { error: json({ error: 'Utilizador não autenticado' }, 401) };

  const admin = createClient(cfg.supabaseUrl, cfg.serviceKey);

  // Must be an active admin member of THIS organization (multi-tenant check).
  // Super admins (global) are allowed too. Checks run in parallel.
  const [{ data: membership }, { data: superRole }] = await Promise.all([
    admin
      .from('organization_members')
      .select('role, is_active')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle(),
  ]);

  const isAdmin = membership?.role === 'admin' || !!superRole;
  if (!isAdmin) {
    return { error: json({ error: 'Apenas administradores podem gerir canais' }, 403) };
  }

  return { admin, userId: user.id };
}

// Validate that the caller is an active member of the given organization (any role).
// Used by the inbox (agents read/reply, not only admins).
export async function authOrgMember(
  req: Request,
  cfg: MulticanalConfig,
  organizationId: string,
): Promise<{ admin: SupabaseClient; userId: string } | { error: Response }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { error: json({ error: 'Não autorizado' }, 401) };
  if (!organizationId) return { error: json({ error: 'organization_id em falta' }, 400) };

  const userClient = createClient(cfg.supabaseUrl, cfg.anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return { error: json({ error: 'Utilizador não autenticado' }, 401) };

  const admin = createClient(cfg.supabaseUrl, cfg.serviceKey);

  // Run both checks in parallel — sequential round trips were a visible part of
  // the inbox latency (every action pays this cost).
  const [{ data: membership }, { data: superRole }] = await Promise.all([
    admin
      .from('organization_members')
      .select('is_active')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle(),
  ]);

  if (!membership && !superRole) {
    return { error: json({ error: 'Sem acesso a esta organização' }, 403) };
  }
  return { admin, userId: user.id };
}

// Resolve the org's Chatwoot account id + token (must already be provisioned).
export async function getOrgChatwoot(
  admin: SupabaseClient,
  organizationId: string,
): Promise<{ accountId: number; token: string } | null> {
  const { data: org } = await admin
    .from('organizations')
    .select('chatwoot_account_id, chatwoot_account_token')
    .eq('id', organizationId)
    .single();
  if (!org?.chatwoot_account_id || !org?.chatwoot_account_token) return null;
  return { accountId: org.chatwoot_account_id, token: org.chatwoot_account_token };
}

// fetch with an abort timeout so a hung Chatwoot/Evolution/Gemini call can't
// stall the edge function until the platform kills it.
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Call a Chatwoot Application API endpoint for a given account token.
export async function chatwootFetch(
  cfg: MulticanalConfig,
  token: string,
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<Response> {
  return fetchWithTimeout(`${cfg.chatwootUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', api_access_token: token },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Call the Evolution API.
export async function evolutionFetch(
  cfg: MulticanalConfig,
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<Response> {
  return fetchWithTimeout(`${cfg.evolutionUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', apikey: cfg.evolutionKey },
    body: body ? JSON.stringify(body) : undefined,
  });
}

interface OrgRow {
  id: string;
  name: string;
  chatwoot_account_id: number | null;
  chatwoot_account_token: string | null;
}

// Ensure the organization has its own Chatwoot account (provision via Platform API
// on first use). Returns the account id + an access token for that account.
export async function ensureChatwootAccount(
  admin: SupabaseClient,
  cfg: MulticanalConfig,
  org: OrgRow,
): Promise<{ accountId: number; token: string }> {
  if (org.chatwoot_account_id && org.chatwoot_account_token) {
    return { accountId: org.chatwoot_account_id, token: org.chatwoot_account_token };
  }
  if (!cfg.chatwootPlatformToken) {
    throw new Error('CHATWOOT_PLATFORM_TOKEN não configurado nas secrets');
  }

  const platformHeaders = {
    'Content-Type': 'application/json',
    api_access_token: cfg.chatwootPlatformToken,
  };

  // 1) Create the account
  const accRes = await fetch(`${cfg.chatwootUrl}/platform/api/v1/accounts`, {
    method: 'POST',
    headers: platformHeaders,
    body: JSON.stringify({ name: org.name }),
  });
  if (!accRes.ok) {
    throw new Error(`Chatwoot account create failed: ${accRes.status} ${await accRes.text()}`);
  }
  const account = await accRes.json();
  const accountId = account.id as number;

  // 2) Create a dedicated user for this account (returns an access_token)
  const email = `bot+${org.id}@senvia.pt`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const userRes = await fetch(`${cfg.chatwootUrl}/platform/api/v1/users`, {
    method: 'POST',
    headers: platformHeaders,
    body: JSON.stringify({ name: `${org.name}`, email, password }),
  });
  if (!userRes.ok) {
    throw new Error(`Chatwoot user create failed: ${userRes.status} ${await userRes.text()}`);
  }
  const cwUser = await userRes.json();
  const userId = cwUser.id as number;
  const token = cwUser.access_token as string;

  // 3) Link user to account as administrator
  const linkRes = await fetch(
    `${cfg.chatwootUrl}/platform/api/v1/accounts/${accountId}/account_users`,
    { method: 'POST', headers: platformHeaders, body: JSON.stringify({ user_id: userId, role: 'administrator' }) },
  );
  if (!linkRes.ok) {
    throw new Error(`Chatwoot account_user link failed: ${linkRes.status} ${await linkRes.text()}`);
  }

  // 4) Persist on the organization
  await admin
    .from('organizations')
    .update({ chatwoot_account_id: accountId, chatwoot_account_token: token })
    .eq('id', org.id);

  return { accountId, token };
}
