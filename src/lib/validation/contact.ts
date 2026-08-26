import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

// Contact validation — browser side, for the forms that ingest leads.
//
// FICHEIRO GERADO. Não editar à mão: corre `node gerar-validacao.cjs`.
// É o mesmo ficheiro que supabase/functions/_shared/contact-validation.ts,
// só com outro import. Não há carregador de módulos partilhado entre as Edge
// Functions em Deno e o bundle do Vite, e ter duas cópias mantidas à mão já
// custou caro — a lista de domínios descartáveis do lado do browser tinha
// ficado a metade da do servidor, sem ninguém dar por isso.
//
//   * Phone: validated against the country's NUMBERING PLAN via libphonenumber
//     (`/max` metadata — the only set that carries the per-operator patterns),
//     plus our own anti-fake heuristics on top. Portugal is the default when no
//     country code is given. Normalizes to E.164.
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

/**
 * Telefone português. Mantida porque o nome continua importado noutros sítios;
 * por dentro é a mesma validação por plano de numeração, com Portugal como
 * país por omissão.
 */
export function normalizePtPhone(raw: string | null | undefined): ValidationResult<string> {
  const r = validarTelefone(raw, 'PT');
  return r.ok ? { ok: true, value: r.value.e164 } : r;
}

/**
 * Um número obviamente inventado, mesmo quando o plano de numeração o aceita.
 *
 * O plano de numeração diz se um número PODE existir, não se é a sério.
 * `+351 911 111 111` e `+351 912 345 678` passam a validação oficial — o
 * prefixo 91 existe e o comprimento está certo — e nenhum dos dois é o número
 * de ninguém. É contra isto que estas regras existem.
 */
function pareceInventado(nacional: string, pais: string | null): string | null {
  // Todos os dígitos iguais: 911111111, 222222222.
  if (/^(\d)\1+$/.test(nacional)) return "Telefone obviamente falso";

  /** Uma escada de dígitos consecutivos, para cima ou para baixo. */
  const ehEscada = (s: string) => {
    let sobe = true, desce = true;
    for (let i = 1; i < s.length; i++) {
      const d = s.charCodeAt(i) - s.charCodeAt(i - 1);
      if (d !== 1) sobe = false;
      if (d !== -1) desce = false;
      if (!sobe && !desce) return false;
    }
    return sobe || desce;
  };

  // O número inteiro em escada — vale para qualquer país.
  if (nacional.length >= 6 && ehEscada(nacional)) {
    return "Telefone sequencial inválido";
  }

  // Sete dígitos iguais no fim: 911111111, 962222222.
  //
  // O `todos iguais` acima não os apanha — o prefixo da operadora é diferente
  // do resto — e o plano de numeração aceita-os, porque o prefixo é real. Sete
  // repetições seguidas não acontecem num número atribuído a alguém.
  if (nacional.length >= 8 && /^(\d)\1{6}$/.test(nacional.slice(-7))) {
    return "Telefone obviamente falso";
  }

  // A partir daqui, SÓ PORTUGAL.
  //
  // O falso mais comum cá é `912345678`, onde a escada começa depois do prefixo
  // da operadora — a verificar só o número inteiro, ele passava. Mas aplicar
  // esta regra a toda a gente rejeitava números estrangeiros perfeitamente
  // plausíveis: o teste apanhou um brasileiro (+55 11 98765-4321) e um espanhol
  // (+34 600 123 456) a serem recusados. Em Portugal sei o que é um número a
  // sério; lá fora não sei, e recusar um lead verdadeiro é pior do que aceitar
  // um falso.
  if (pais === "PT" && nacional.length === 9 && ehEscada(nacional.slice(2))) {
    return "Telefone sequencial inválido";
  }

  // O mesmo par repetido do princípio ao fim: 919191919, 212121212.
  if (nacional.length >= 8 && /^(\d\d)\1{3,}\d?$/.test(nacional)) {
    return "Telefone obviamente falso";
  }

  return null;
}

/**
 * Valida um telefone contra o PLANO DE NUMERAÇÃO do país a que pertence.
 *
 * PORQUE É QUE ISTO SUBSTITUIU AS REGRAS ESCRITAS À MÃO
 *
 * Um número de telefone não tem dígito de controlo — não há checksum como no
 * NIF ou no IBAN. O mais perto que existe é confrontá-lo com o plano de
 * numeração: o comprimento certo para aquele país, e um prefixo de operadora
 * que exista mesmo. É isso que a `libphonenumber` faz, com as tabelas que a
 * Google mantém a partir dos reguladores.
 *
 * O que se ganha, em concreto: `+351 999 999 999` e `+351 981 234 567` eram
 * aceites (nove dígitos, começa por 9) e agora são recusados — o 99 e o 98 não
 * estão atribuídos a operadora nenhuma em Portugal. E os outros países deixam
 * de ser "entre 8 e 15 dígitos", que aceitava quase tudo.
 *
 * Usa-se o conjunto de metadados `/max`: é o único que traz os padrões por
 * operadora e o TIPO do número. O `/min`, que é o predefinido, só confere o
 * comprimento — com ele, `+351 999 999 999` passava à mesma.
 */
export function validarTelefone(
  raw: string | null | undefined,
  paisPorOmissao: CountryCode = "PT",
): ValidationResult<{ e164: string; tipo: string | null; pais: string | null }> {
  if (!raw) return { ok: false, reason: "Telefone em falta" };

  let cleaned = String(raw).replace(/[\s\-.()_/]/g, "");
  cleaned = cleaned.replace(/^00/, "+");

  // Sem indicativo assume-se Portugal — é um CRM português, e os números
  // nacionais escritos à mão quase nunca o trazem.
  const semIndicativo = !cleaned.startsWith("+");

  const numero = parsePhoneNumberFromString(
    cleaned,
    semIndicativo ? paisPorOmissao : undefined,
  );

  if (!numero) {
    return { ok: false, reason: "Telefone inválido" };
  }

  if (!numero.isValid()) {
    // A mensagem diz o que fazer, não só que está errado. Distinguir o
    // comprimento do prefixo poupa a quem preenche uma segunda tentativa às
    // cegas.
    //
    // As frases sobre Portugal SÓ se usam quando o número é mesmo português.
    // Um `+1 555 555 5555` levava com "um número português tem 9 dígitos", que
    // não ajuda ninguém — o país vinha da omissão, não do que foi escrito.
    const nacional = String(numero.nationalNumber ?? "");
    const ehPortugues = semIndicativo
      ? paisPorOmissao === "PT"
      : numero.country === "PT" || cleaned.startsWith("+351");

    if (ehPortugues) {
      return {
        ok: false,
        reason: nacional.length !== 9
          ? "Um número português tem 9 dígitos"
          : "Esse prefixo não existe em Portugal — os telemóveis começam por 91, 92, 93 ou 96",
      };
    }
    return { ok: false, reason: "Esse número não existe no país indicado" };
  }

  const inventado = pareceInventado(
    String(numero.nationalNumber ?? ""),
    numero.country ?? (semIndicativo ? paisPorOmissao : null),
  );
  if (inventado) return { ok: false, reason: inventado };

  return {
    ok: true,
    value: {
      e164: numero.number,
      // MOBILE | FIXED_LINE | FIXED_LINE_OR_MOBILE | ... ou null quando a Meta
      // dos metadados não consegue decidir.
      tipo: numero.getType() ?? null,
      pais: numero.country ?? null,
    },
  };
}

/**
 * A forma antiga, mantida porque é o que os chamadores esperam: devolve só o
 * E.164. Por dentro é a validação nova.
 */
export function normalizeInternationalPhone(raw: string | null | undefined): ValidationResult<string> {
  const r = validarTelefone(raw);
  return r.ok ? { ok: true, value: r.value.e164 } : r;
}

export function normalizeEmail(raw: string | null | undefined): ValidationResult<string> {
  if (!raw) return { ok: false, reason: "Email em falta" };

  const trimmed = String(raw).trim().toLowerCase();

  // O hífen fica no FIM da classe, sem barra: escapá-lo lá dentro é
  // desnecessário e o ESLint do lado do browser recusa-o (este ficheiro é
  // gerado para lá).
  const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
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
