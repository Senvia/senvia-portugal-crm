// Contact validation — Deno side, for Edge Functions that ingest leads.
// Mirror of src/lib/validation/contact.ts (keep both in sync — there's no
// shared module loader between Deno Edge Functions and the Vite bundle).
//
// Rules are PT-focused since this is a Portugal-only CRM:
//   * Phone: PT mobile (9 + [1,2,3,6]) or PT landline (2 + 8 digits), accepts
//     +351, 00351, leading 0 or none. Normalizes to E.164 (+351XXXXXXXXX).
//   * Email: standard regex + curated disposable-domain blocklist + obvious-
//     fake localparts (test@, asdf@, etc.) blocked.

const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "mailinator.com", "tempmail.com", "temp-mail.org", "temp-mail.io",
  "10minutemail.com", "10minutemail.net", "10minutemail.co.uk",
  "guerrillamail.com", "guerrillamail.net", "guerrillamail.biz",
  "guerrillamail.org", "guerrillamail.de", "guerrillamailblock.com",
  "throwaway.email", "throwawaymail.com", "yopmail.com", "yopmail.fr",
  "yopmail.net", "dispostable.com", "maildrop.cc", "spam4.me",
  "sharklasers.com", "trashmail.com", "trashmail.net", "getairmail.com",
  "getnada.com", "nada.email", "mohmal.com", "inboxalias.com",
  "mintemail.com", "mytemp.email", "fakeinbox.com", "meltmail.com",
  "mailcatch.com", "spamgourmet.com", "mvrht.net", "jetable.org",
  "haribu.com", "tempinbox.com", "tempemail.net", "tempr.email",
  "mailnesia.com", "mailnull.com", "spambox.us", "spambog.com",
  "spambog.de", "spambog.ru", "mailmoat.com", "incognitomail.org",
  "incognitomail.com", "tempmailer.com", "tempmailo.com", "tempmail.us",
  "tempmail.cc", "crazymailing.com", "minutemail.com", "mailtemp.info",
  "ethereal.email", "tafmail.com", "wegwerfemail.de", "wegwerfemail.net",
  "byom.de", "byebyemail.com", "mailde.de", "mailde.info",
  "burnermail.io", "burner.email", "spambox.org", "anonbox.net",
  "anonymbox.com", "deadaddress.com", "discard.email", "discardmail.com",
  "discardmail.de", "emailto.de", "explodemail.com", "fakemailgenerator.com",
  "tempmailaddress.com", "tempemails.io", "throwawaymail.pp.ua",
  "mailtothis.com", "dropmail.me", "emailfake.com", "emltmp.com",
  "fakeinbox.org", "fakemail.fr", "fakemail.net", "luxusmail.org",
  "mailblocks.com", "mailcatcher.com", "mailexpire.com", "mailguard.me",
  "mailimate.com", "mailinator.net", "mailinator.org", "mailinator2.com",
  "mailmoat.de", "mailshell.com", "mailtempo.com", "mvlfvrxxqsv.com",
  "neverbox.com", "no-spam.ws", "nogmailspam.info", "objectmail.com",
  "obobbo.com", "onewaymail.com", "oopi.org", "ovi.com", "ovpn.to",
  "owlpic.com", "pancakemail.com", "papierkorb.me", "pjjkp.com",
  "plexolan.de", "politikerclub.de", "poofy.org", "pookmail.com",
  "privacy.net", "privatdemail.net", "proxymail.eu", "rcpt.at",
  "recode.me", "recursor.net", "regbypass.com", "rmqkr.net", "rppkn.com",
  "rtrtr.com", "s0ny.net", "safe-mail.net", "sandelf.de", "saynotospams.com",
  "sceath.org", "schafmail.de", "schreib-doch-mal-wieder.de",
  "selfdestructingmail.com", "selfdestructingmail.org", "sendspamhere.com",
  "shitmail.me", "shitware.nl", "shmeriously.com", "shortmail.net",
  "sibmail.com", "skeefmail.com", "slipry.net", "slopsbox.com",
  "smashmail.de", "smellfear.com", "snakemail.com", "sneakemail.com",
  "sofimail.com", "solvemail.info", "soodonims.com", "spam.la",
  "spam.org.es", "spamavert.com", "spambob.net", "spambog.com",
  "spamfighter.cf", "spamfighter.ga", "spamfighter.gq", "spamfighter.ml",
  "spamfighter.tk", "spamfree24.com", "spamfree24.de", "spamfree24.eu",
  "spamfree24.info", "spamfree24.net", "spamfree24.org", "spamhereplease.com",
  "spaminator.de", "spamkill.info", "spaml.com", "spaml.de", "spammotel.com",
  "spamobox.com", "spamoff.de", "spamslicer.com", "spamspot.com",
  "spamthis.co.uk", "spamthisplease.com", "speed.1s.fr", "supergreatmail.com",
  "supermailer.jp", "suremail.info", "talkinator.com", "teewars.org",
  "teleworm.com", "teleworm.us", "tempmaildemand.com", "tempmail2.com",
  "tempymail.com", "thanksnospam.info", "thankyou2010.com", "thc.st",
  "thelimestones.com", "thisisnotmyrealemail.com", "thismail.net",
  "tilien.com", "tittbit.in", "tizi.com", "tmail.ws", "tmailinator.com",
  "toomail.biz", "topranklist.de", "tradermail.info", "trash-amil.com",
  "trash-mail.at", "trash-mail.com", "trash-mail.de", "trash2009.com",
  "trashdevil.com", "trashemail.de", "trashmail.at", "trashmail.io",
  "trashmail.me", "trashmail.ws", "trashmailer.com", "trashymail.com",
  "trashymail.net", "trialmail.de", "trillianpro.com", "tryalert.com",
  "twinmail.de", "tyldd.com", "uggsrock.com", "umail.net", "uroid.com",
  "us.af", "venompen.com", "veryrealemail.com", "viditag.com",
  "viralplays.com", "vmail.me", "voidbay.com", "vomoto.com", "vpn.st",
  "vsimcard.com", "vubby.com", "wasteland.rfc822.org", "webemail.me",
  "webm4il.info", "webuser.in", "wegwerf-email.de", "wegwerfmail.de",
  "wegwerfmail.info", "wegwerfmail.net", "wegwerfmail.org", "wh4f.org",
  "whyspam.me", "willhackforfood.biz", "willselfdestruct.com",
  "winemaven.info", "wronghead.com", "wuzup.net", "wuzupmail.net",
  "www.e4ward.com", "www.gishpuppy.com", "www.mailinator.com",
  "wwwnew.eu", "xagloo.com", "xemaps.com", "xents.com", "xmaily.com",
  "xoxy.net", "yapped.net", "yeah.net", "yep.it", "yogamaven.com",
  "yuurok.com", "z1p.biz", "za.com", "zehnminuten.de", "zehnminutenmail.de",
  "zippymail.info", "zoaxe.com", "zoemail.org", "zomg.info",
]);

const FAKE_LOCAL_PARTS = new Set<string>([
  "test", "tests", "testing", "teste", "tester", "testar",
  "asd", "asdf", "asdfg", "qwer", "qwert", "qwerty",
  "fake", "noemail", "no-email", "nomail", "no-mail",
  "noreply", "no-reply", "naoresponder", "naotem", "nao-tem",
  "aaa", "bbb", "ccc", "ddd", "xxx", "yyy", "zzz", "abc",
  "abcd", "abcde", "exemplo", "example", "exemplo123",
]);

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export function normalizePtPhone(raw: string | null | undefined): ValidationResult<string> {
  if (!raw) return { ok: false, reason: "Telefone em falta" };

  // Strip whitespace, dashes, dots, parentheses, underscores
  let cleaned = String(raw).replace(/[\s\-.()_]/g, "");

  // International prefix forms: +351, 00351, 351
  cleaned = cleaned.replace(/^\+/, "");
  cleaned = cleaned.replace(/^00/, "");
  if (cleaned.startsWith("351")) cleaned = cleaned.slice(3);

  // Drop leading 0 used in national format (e.g. 0912 345 678)
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);

  // After stripping prefixes must be exactly 9 digits
  if (!/^\d{9}$/.test(cleaned)) {
    return { ok: false, reason: "Telefone deve ter 9 dígitos" };
  }

  const first = cleaned[0];
  const second = cleaned[1];

  // Must start with 9 (mobile) or 2 (landline)
  if (first !== "9" && first !== "2") {
    return { ok: false, reason: "Telefone PT começa por 9 (móvel) ou 2 (fixo)" };
  }

  // Mobile prefixes in PT: 91, 92, 93, 96 (MEO, Vodafone, NOS, NOWO/other)
  if (first === "9" && !["1", "2", "3", "6"].includes(second)) {
    return { ok: false, reason: "Prefixo móvel PT inválido" };
  }

  // Reject all-same digit (999999999, 111111111, etc.)
  if (/^(\d)\1{8}$/.test(cleaned)) {
    return { ok: false, reason: "Telefone obviamente falso" };
  }

  // Reject ascending or descending sequence (123456789, 987654321)
  if (cleaned === "123456789" || cleaned === "987654321") {
    return { ok: false, reason: "Telefone sequencial inválido" };
  }

  return { ok: true, value: "+351" + cleaned };
}

export function normalizeEmail(raw: string | null | undefined): ValidationResult<string> {
  if (!raw) return { ok: false, reason: "Email em falta" };

  const trimmed = String(raw).trim().toLowerCase();

  const EMAIL_RE = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, reason: "Formato de email inválido" };
  }

  const at = trimmed.indexOf("@");
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  if (local.length < 2) {
    return { ok: false, reason: "Email inválido" };
  }

  if (FAKE_LOCAL_PARTS.has(local)) {
    return { ok: false, reason: "Email obviamente falso" };
  }

  // All-same-char localpart (aaaaa@gmail.com)
  if (local.length > 2 && /^(.)\1+$/.test(local)) {
    return { ok: false, reason: "Email obviamente falso" };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { ok: false, reason: "Email temporário não é aceite" };
  }

  return { ok: true, value: trimmed };
}
