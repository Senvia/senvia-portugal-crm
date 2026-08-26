// Shared security helpers for Edge Functions: input validation + rate limiting.

// ─── In-memory rate limiter ───────────────────────────────────────────────────
// Tracks request counts per key (e.g. IP + endpoint) over a sliding window.
// State is per-function-instance; cold starts reset it, but that's acceptable for
// burst protection. Configuration: limit requests per windowMs.

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateStore = new Map<string, RateEntry>();

// Periodically sweep stale entries to avoid memory creep.
const SWEEP_INTERVAL = 60_000;
const SWEEP_THRESHOLD = 10_000; // only sweep when the map is large
let lastSweep = Date.now();

function sweep(): void {
  const now = Date.now();
  if (rateStore.size < SWEEP_THRESHOLD || now - lastSweep < SWEEP_INTERVAL) return;
  lastSweep = now;
  for (const [key, entry] of rateStore) {
    if (now >= entry.resetAt) rateStore.delete(key);
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAfterMs: number } {
  sweep();
  const now = Date.now();
  const entry = rateStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAfterMs: windowMs };
  }

  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAfterMs: entry.resetAt - now };
  }

  return { allowed: true, remaining: limit - entry.count, resetAfterMs: entry.resetAt - now };
}

// ─── Rate limiter partilhado (base de dados) ─────────────────────────────────
//
// O limitador acima guarda a contagem na memória DA INSTÂNCIA. As Edge Functions
// correm em várias instâncias ao mesmo tempo e reiniciam a frio a toda a hora,
// por isso quem manda pedidos a sério cai em instâncias diferentes e cada uma
// acha que é o primeiro pedido dele. Serve para travar um pico; não serve para
// travar um abuso.
//
// Este conta na base de dados, onde todas as instâncias veem a mesma coisa.
// Custa uma ida ao Postgres por pedido — pouco, ao pé de tudo o que o
// `submit-lead` faz a seguir (grava, classifica com IA, envia email e push).

export interface LimiteResultado {
  allowed: boolean;
  hits: number;
  retryAfter: number;
}

/**
 * Conta um pedido no balde indicado e diz se ele passa.
 *
 * FALHA ABERTO, de propósito: se o Postgres não responder, deixa passar. Um
 * limitador que rejeita tudo quando a base de dados tosse transforma um
 * problema pequeno numa paragem do formulário — e formulários públicos são
 * receita. O erro fica no registo.
 */
export async function rateLimitDb(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<LimiteResultado> {
  try {
    const { data, error } = await supabase.rpc('rate_limit_check', {
      _bucket: bucket,
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) {
      console.error('[rate-limit] falhou, a deixar passar:', error.message);
      return { allowed: true, hits: 0, retryAfter: 0 };
    }
    return {
      allowed: data?.allowed !== false,
      hits: Number(data?.hits ?? 0),
      retryAfter: Number(data?.retry_after ?? windowSeconds),
    };
  } catch (e) {
    console.error('[rate-limit] exceção, a deixar passar:', (e as Error).message);
    return { allowed: true, hits: 0, retryAfter: 0 };
  }
}

/**
 * De onde veio o pedido.
 *
 * Atrás do proxy da Supabase o `x-forwarded-for` traz uma lista; o primeiro é o
 * cliente. Sem isto, todos os pedidos partilhavam o mesmo balde — o do proxy —
 * e o limite de um utilizador bloqueava toda a gente.
 */
export function ipDoPedido(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? 'desconhecido';
}

/** A resposta 429, com o cabeçalho que diz quando voltar. */
export function respostaLimiteExcedido(
  retryAfter: number,
  headers: Record<string, string>,
  mensagem = 'Demasiados pedidos. Tenta outra vez daqui a pouco.',
): Response {
  return new Response(
    JSON.stringify({ error: mensagem, retry_after: retryAfter }),
    {
      status: 429,
      headers: { ...headers, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
    },
  );
}

// ─── Input validation ─────────────────────────────────────────────────────────
// Simple schema validation without Zod — keeps edge function bundles small (Deno
// bundles everything into one file on deploy, so Zod adds ~50 KB to EVERY function
// that imports it). Each action gets a field spec: { fieldName: type }.

type FieldType = 'string' | 'number' | 'boolean' | 'optional-string' | 'optional-number';

export interface ActionSchema {
  [action: string]: Record<string, FieldType>;
}

export function validateActionPayload(
  action: string,
  body: Record<string, unknown>,
  schemas: ActionSchema,
): { valid: true } | { valid: false; error: string; status: number } {
  const fields = schemas[action];
  if (!fields) return { valid: true }; // unknown action, let the handler reject it

  for (const [field, type] of Object.entries(fields)) {
    const value = body[field];
    const isOptional = type === 'optional-string' || type === 'optional-number';

    if (value === undefined || value === null) {
      if (isOptional) continue;
      return { valid: false, error: `Campo obrigatório: ${field}`, status: 400 };
    }

    switch (type) {
      case 'string':
      case 'optional-string':
        if (typeof value !== 'string') {
          return { valid: false, error: `Campo ${field} deve ser texto`, status: 400 };
        }
        break;
      case 'number':
      case 'optional-number':
        if (typeof value !== 'number') {
          return { valid: false, error: `Campo ${field} deve ser número`, status: 400 };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: `Campo ${field} deve ser verdadeiro/falso`, status: 400 };
        }
        break;
    }
  }

  return { valid: true };
}
