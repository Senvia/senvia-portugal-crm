// Contact validation — browser side, for forms that ingest leads.
// Mirror of supabase/functions/_shared/contact-validation.ts (keep both in
// sync — there is no shared module loader between the Vite bundle and the
// Deno Edge Functions).
//
// Rules are PT-focused since this is a Portugal-only CRM:
//   * Phone: PT mobile (9 + [1,2,3,6]) or PT landline (2 + 8 digits), accepts
//     +351, 00351, leading 0 or none. Normalizes to E.164 (+351XXXXXXXXX).
//   * Email: standard regex + curated disposable-domain blocklist + obvious-
//     fake localparts (test@, asdf@, etc.) blocked.

const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  'mailinator.com', 'tempmail.com', 'temp-mail.org', 'temp-mail.io',
  '10minutemail.com', '10minutemail.net', '10minutemail.co.uk',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.biz',
  'guerrillamail.org', 'guerrillamail.de', 'guerrillamailblock.com',
  'throwaway.email', 'throwawaymail.com', 'yopmail.com', 'yopmail.fr',
  'yopmail.net', 'dispostable.com', 'maildrop.cc', 'spam4.me',
  'sharklasers.com', 'trashmail.com', 'trashmail.net', 'getairmail.com',
  'getnada.com', 'nada.email', 'mohmal.com', 'inboxalias.com',
  'mintemail.com', 'mytemp.email', 'fakeinbox.com', 'meltmail.com',
  'mailcatch.com', 'spamgourmet.com', 'mvrht.net', 'jetable.org',
  'haribu.com', 'tempinbox.com', 'tempemail.net', 'tempr.email',
  'mailnesia.com', 'mailnull.com', 'spambox.us', 'spambog.com',
  'spambog.de', 'spambog.ru', 'mailmoat.com', 'incognitomail.org',
  'incognitomail.com', 'tempmailer.com', 'tempmailo.com', 'tempmail.us',
  'tempmail.cc', 'crazymailing.com', 'minutemail.com', 'mailtemp.info',
  'ethereal.email', 'tafmail.com', 'wegwerfemail.de', 'wegwerfemail.net',
  'byom.de', 'byebyemail.com', 'mailde.de', 'mailde.info',
  'burnermail.io', 'burner.email', 'spambox.org', 'anonbox.net',
  'anonymbox.com', 'deadaddress.com', 'discard.email', 'discardmail.com',
  'discardmail.de', 'emailto.de', 'explodemail.com', 'fakemailgenerator.com',
  'tempmailaddress.com', 'tempemails.io', 'throwawaymail.pp.ua',
  'mailtothis.com', 'dropmail.me', 'emailfake.com', 'emltmp.com',
]);

const FAKE_LOCAL_PARTS = new Set<string>([
  'test', 'tests', 'testing', 'teste', 'tester', 'testar',
  'asd', 'asdf', 'asdfg', 'qwer', 'qwert', 'qwerty',
  'fake', 'noemail', 'no-email', 'nomail', 'no-mail',
  'noreply', 'no-reply', 'naoresponder', 'naotem', 'nao-tem',
  'aaa', 'bbb', 'ccc', 'ddd', 'xxx', 'yyy', 'zzz', 'abc',
  'abcd', 'abcde', 'exemplo', 'example', 'exemplo123',
]);

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export function normalizePtPhone(raw: string | null | undefined): ValidationResult<string> {
  if (!raw) return { ok: false, reason: 'Telefone em falta' };

  let cleaned = String(raw).replace(/[\s\-.()_]/g, '');
  cleaned = cleaned.replace(/^\+/, '');
  cleaned = cleaned.replace(/^00/, '');
  if (cleaned.startsWith('351')) cleaned = cleaned.slice(3);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);

  if (!/^\d{9}$/.test(cleaned)) {
    return { ok: false, reason: 'Telefone deve ter 9 dígitos' };
  }

  const first = cleaned[0];
  const second = cleaned[1];

  if (first !== '9' && first !== '2') {
    return { ok: false, reason: 'Telefone PT começa por 9 (móvel) ou 2 (fixo)' };
  }

  if (first === '9' && !['1', '2', '3', '6'].includes(second)) {
    return { ok: false, reason: 'Prefixo móvel PT inválido' };
  }

  if (/^(\d)\1{8}$/.test(cleaned)) {
    return { ok: false, reason: 'Telefone obviamente falso' };
  }

  if (cleaned === '123456789' || cleaned === '987654321') {
    return { ok: false, reason: 'Telefone sequencial inválido' };
  }

  return { ok: true, value: '+351' + cleaned };
}

// Accepts a phone WITH its country code (E.164-ish), as produced by the
// PhoneInput country selector. Portugal (+351) gets the strict PT rules; other
// countries get a basic E.164 sanity check. Returns the full number WITH the
// country code (+351912345678, +5511987654321, ...) — the code is never stripped.
export function normalizeInternationalPhone(raw: string | null | undefined): ValidationResult<string> {
  if (!raw) return { ok: false, reason: 'Telefone em falta' };

  let cleaned = String(raw).replace(/[\s\-.()_]/g, '');
  cleaned = cleaned.replace(/^00/, '+');

  // No country code provided: assume Portugal (back-compat with bare national numbers).
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
    cleaned = '+351' + cleaned;
  }

  // Portugal: keep the strict PT rules (prefixes, anti-fake).
  if (cleaned.startsWith('+351')) {
    return normalizePtPhone(cleaned);
  }

  // Other countries: basic E.164 check (8 to 15 digits including country code).
  const digits = cleaned.slice(1);
  if (!/^\d{8,15}$/.test(digits)) {
    return { ok: false, reason: 'Número internacional inválido' };
  }
  if (/^(\d)\1+$/.test(digits)) {
    return { ok: false, reason: 'Telefone obviamente falso' };
  }
  return { ok: true, value: '+' + digits };
}

export function normalizeEmail(raw: string | null | undefined): ValidationResult<string> {
  if (!raw) return { ok: false, reason: 'Email em falta' };

  const trimmed = String(raw).trim().toLowerCase();

  const EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, reason: 'Formato de email inválido' };
  }

  const at = trimmed.indexOf('@');
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  if (local.length < 2) {
    return { ok: false, reason: 'Email inválido' };
  }

  if (FAKE_LOCAL_PARTS.has(local)) {
    return { ok: false, reason: 'Email obviamente falso' };
  }

  if (local.length > 2 && /^(.)\1+$/.test(local)) {
    return { ok: false, reason: 'Email obviamente falso' };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { ok: false, reason: 'Email temporário não é aceite' };
  }

  return { ok: true, value: trimmed };
}
