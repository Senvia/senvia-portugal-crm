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
