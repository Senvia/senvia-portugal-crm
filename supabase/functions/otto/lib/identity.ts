// Identidade do Otto: quem está do outro lado, e se já nos apresentámos.
//
// Duas regras que vêm do produto e não são negociáveis:
//
//   1. O Otto apresenta-se UMA vez por pessoa. Não por sessão, não por dia —
//      uma vez. Por isso o estado vive na base de dados (otto_contacts.presented)
//      e não na conversa: memória de conversa desaparece ao recarregar a página,
//      e ele voltava a dizer "olá, chamo-me Otto" a quem fala com ele há meses.
//
//   2. Trata sempre pelo nome. Nunca "senhor", "senhora", "utilizador" ou
//      "amigo" — soa a formulário, não a colega. Se não houver nome, pergunta
//      como quer ser tratado, em vez de inventar um tratamento genérico.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

export interface OttoIdentity {
  contactId: string | null;
  /** Primeiro nome, quando se conhece. */
  name: string | null;
  /** true quando é a primeira vez desta pessoa nesta organização. */
  shouldIntroduce: boolean;
}

/** Saudação pela hora de Lisboa, não pela do servidor. */
export function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("pt-PT", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/Lisbon",
    }).format(now),
  );
  if (hour < 12) return "bom dia";
  if (hour < 20) return "boa tarde";
  return "boa noite";
}

async function resolveName(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle<{ full_name: string | null }>();

  const full = data?.full_name?.trim();
  if (!full) return null;
  // Só o primeiro nome: "Olá, Thiago" e não "Olá, Thiago Sousa".
  return full.split(/\s+/)[0] ?? null;
}

/**
 * Carrega (ou cria) o contacto desta pessoa nesta organização.
 *
 * Nunca lança: se a auditoria falhar, o Otto continua a responder. Um assistente
 * mudo por causa de uma tabela de registo é pior do que um registo em falta.
 */
export async function loadIdentity(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<OttoIdentity> {
  try {
    const name = await resolveName(supabase, userId);

    const { data: existing } = await supabase
      .from("otto_contacts")
      .select("id, presented, name")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle<{ id: string; presented: boolean; name: string | null }>();

    if (existing) {
      // Mantém o nome actualizado se a pessoa mudou o perfil entretanto.
      if (name && name !== existing.name) {
        await supabase.from("otto_contacts").update({ name }).eq("id", existing.id);
      }
      return { contactId: existing.id, name: name ?? existing.name, shouldIntroduce: !existing.presented };
    }

    const { data: created } = await supabase
      .from("otto_contacts")
      .insert({ organization_id: organizationId, user_id: userId, name })
      .select("id")
      .maybeSingle<{ id: string }>();

    return { contactId: created?.id ?? null, name, shouldIntroduce: true };
  } catch {
    // Sem auditoria, assume-se que já houve contacto: repetir a apresentação a
    // quem já a ouviu é mais estranho do que omiti-la a quem é novo.
    return { contactId: null, name: null, shouldIntroduce: false };
  }
}

/** Marca a apresentação como feita. Idempotente. */
export async function markPresented(
  supabase: SupabaseClient,
  contactId: string | null,
): Promise<void> {
  if (!contactId) return;
  try {
    await supabase
      .from("otto_contacts")
      .update({ presented: true, introduced_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("presented", false);
  } catch {
    // Falhar aqui só faz o Otto apresentar-se outra vez. Não vale derrubar a
    // resposta que o utilizador está à espera.
  }
}

/**
 * Instrução de identidade a juntar ao system prompt.
 *
 * Note-se o que NÃO está aqui: nada que mande o Otto dizer que é uma IA. Ele
 * apresenta-se como assistente do SENVIA OS, e só fala da sua natureza se lhe
 * perguntarem directamente — mentir seria pior, calar por iniciativa própria não.
 */
export function identityPrompt(identity: OttoIdentity, now: Date = new Date()): string {
  const lines: string[] = [];

  if (identity.name) {
    lines.push(
      `O nome da pessoa com quem falas é ${identity.name}. Trata-a sempre por esse nome.`,
      `Nunca uses "senhor", "senhora", "utilizador", "amigo" ou outro tratamento genérico.`,
    );
  } else {
    lines.push(
      `Não sabes o nome da pessoa. Pergunta educadamente como prefere ser tratada,`,
      `e usa esse nome a partir daí. Nunca uses tratamentos genéricos entretanto.`,
    );
  }

  if (identity.shouldIntroduce) {
    const hello = identity.name ? `Olá ${identity.name}, ${greeting(now)}` : `Olá, ${greeting(now)}`;
    lines.push(
      `É a primeira vez que esta pessoa fala contigo. Começa a resposta por te`,
      `apresentares, uma só vez: "${hello}, chamo-me Otto, sou assistente do SENVIA OS`,
      `e vou ajudar com as suas questões." Depois responde ao que foi perguntado.`,
    );
  } else {
    lines.push(
      `Esta pessoa já falou contigo antes. NÃO te apresentes nem digas o teu nome:`,
      `responde directamente ao que foi perguntado.`,
    );
  }

  lines.push(
    `Apresenta-te sempre como assistente do SENVIA OS. Não te descrevas como IA,`,
    `bot, modelo ou inteligência artificial, a menos que te perguntem directamente`,
    `— nesse caso responde com honestidade.`,
  );

  return lines.join(" ");
}
