// chatwoot-export — traz o histórico do Chatwoot para as nossas tabelas.
//
// Porque existe: a lista de conversas do CRM nunca leu da nossa base de dados —
// ia buscá-la ao vivo à API do Chatwoot. Em `inbox_messages` temos 12 dias de
// mensagens; tudo o resto, de cinco organizações, existe só no servidor deles.
// Sem isto, desligar aquele contentor levava o histórico com ele.
//
// Corre por páginas e é RETOMÁVEL: cada chamada faz um bocado e diz onde ficou.
// Uma edge function tem tempo limitado, e uma exportação que só funcione se
// correr até ao fim de uma vez é uma exportação que nunca acaba.
//
//   POST { action: 'run', organization_id?, max_pages? }
//        -> exporta (todas as organizações, ou só uma)
//   POST { action: 'status' }
//        -> o que já veio, por organização
//
// Autentica-se pelo x-cron-secret (Vault) ou por service_role: isto lê
// conversas de TODAS as organizações, não é para ser chamado do browser.

import { createClient } from 'npm:@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const log = (s: string, d?: unknown) =>
  console.log(`[CHATWOOT-EXPORT] ${s}${d ? ` - ${JSON.stringify(d)}` : ''}`);

interface CwMessage {
  id: number;
  content: string | null;
  message_type: number | string;
  private?: boolean;
  created_at: number | string;
  sender?: { name?: string; available_name?: string };
  attachments?: unknown[];
}

/** O Chatwoot devolve `message_type` como número (0=recebida, 1=enviada). */
function direcao(t: number | string): string {
  const n = typeof t === 'number' ? t : Number(t);
  if (n === 0 || t === 'incoming') return 'incoming';
  if (n === 1 || t === 'outgoing') return 'outgoing';
  if (n === 2 || t === 'activity') return 'activity';
  return String(t);
}

/** created_at vem em segundos epoch nuns sítios e ISO noutros. */
function quando(v: number | string | null | undefined): string | null {
  if (v == null) return null;
  if (typeof v === 'number') return new Date(v * 1000).toISOString();
  const n = Number(v);
  if (!Number.isNaN(n) && String(n) === String(v)) return new Date(n * 1000).toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const chatwootUrl = (Deno.env.get('CHATWOOT_URL') || '').replace(/\/$/, '');
  const admin = createClient(supabaseUrl, serviceKey);

  // Isto atravessa todas as organizações — não pode ser chamado por um cliente.
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const cronSecret = req.headers.get('x-cron-secret') ?? '';
  let autorizado = bearer === serviceKey;
  if (!autorizado && cronSecret) {
    const { data } = await admin.rpc('get_vault_secret', { p_name: 'automation_internal_secret' })
      .then((r) => r, () => ({ data: null }));
    autorizado = !!data && data === cronSecret;
  }
  if (!autorizado) return json({ error: 'Não autorizado' }, 401);

  if (!chatwootUrl) return json({ error: 'CHATWOOT_URL não está configurado' }, 500);

  const body = await req.json().catch(() => ({}));
  const { action = 'run', organization_id, max_pages = 8 } = body;

  const cwFetch = (token: string, path: string) =>
    fetch(`${chatwootUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', api_access_token: token },
    });

  // ── status ────────────────────────────────────────────────────────────────
  if (action === 'status') {
    const { data } = await admin
      .from('chatwoot_archive_runs')
      .select('organization_id, chatwoot_account_id, status, conversations_seen, messages_saved, last_page, error, finished_at')
      .order('started_at', { ascending: false })
      .limit(20);
    return json({ ok: true, runs: data ?? [] });
  }

  if (action !== 'run') return json({ error: `Ação desconhecida: ${action}` }, 400);

  // ── run ───────────────────────────────────────────────────────────────────
  let orgQuery = admin
    .from('organizations')
    .select('id, name, chatwoot_account_id, chatwoot_account_token')
    .not('chatwoot_account_id', 'is', null);
  if (organization_id) orgQuery = orgQuery.eq('id', organization_id);

  const { data: orgs, error: orgErr } = await orgQuery;
  if (orgErr) return json({ error: orgErr.message }, 500);
  if (!orgs?.length) return json({ ok: true, nota: 'Nenhuma organização com conta Chatwoot.' });

  const resumo: Array<Record<string, unknown>> = [];

  for (const org of orgs) {
    const token = org.chatwoot_account_token as string | null;
    const accountId = org.chatwoot_account_id as number;
    if (!token) {
      resumo.push({ org: org.name, erro: 'sem token' });
      continue;
    }

    // Retoma: continua da página onde a última passagem parou.
    const { data: anterior } = await admin
      .from('chatwoot_archive_runs')
      .select('id, last_page, conversations_seen, messages_saved')
      .eq('organization_id', org.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let pagina = (anterior?.last_page ?? 0) + 1;
    let conversas = anterior?.conversations_seen ?? 0;
    let mensagens = anterior?.messages_saved ?? 0;
    let acabou = false;
    let erro: string | null = null;

    const { data: run } = await admin.from('chatwoot_archive_runs').insert({
      organization_id: org.id,
      chatwoot_account_id: accountId,
      status: 'running',
      conversations_seen: conversas,
      messages_saved: mensagens,
      last_page: pagina - 1,
    }).select('id').single();

    try {
      for (let i = 0; i < max_pages; i++) {
        const res = await cwFetch(token, `/api/v1/accounts/${accountId}/conversations?page=${pagina}&status=all`);
        if (!res.ok) throw new Error(`conversas página ${pagina}: HTTP ${res.status}`);
        const payload = await res.json();
        const lista = payload?.data?.payload ?? payload?.payload ?? [];

        if (!Array.isArray(lista) || lista.length === 0) { acabou = true; break; }

        for (const c of lista) {
          const contacto = c?.meta?.sender ?? {};
          const { data: convRow, error: convErr } = await admin
            .from('chatwoot_archive_conversations')
            .upsert({
              organization_id: org.id,
              chatwoot_account_id: accountId,
              chatwoot_conversation_id: c.id,
              chatwoot_inbox_id: c.inbox_id ?? null,
              channel_type: c?.meta?.channel ?? null,
              contact_name: contacto?.name ?? null,
              contact_phone: contacto?.phone_number ?? null,
              contact_email: contacto?.email ?? null,
              status: String(c.status ?? ''),
              started_at: quando(c.created_at),
              last_activity_at: quando(c.last_activity_at ?? c.timestamp),
              raw: c,
            }, { onConflict: 'chatwoot_account_id,chatwoot_conversation_id' })
            .select('id')
            .single();

          if (convErr || !convRow) {
            log('conversa não guardada', { id: c.id, erro: convErr?.message });
            continue;
          }
          conversas++;

          // As mensagens vêm das mais recentes para trás, 20 de cada vez. O
          // `before` é o id da mais antiga que já vimos.
          let before: number | null = null;
          let guardadasNesta = 0;
          for (let volta = 0; volta < 60; volta++) {
            const url = `/api/v1/accounts/${accountId}/conversations/${c.id}/messages`
              + (before ? `?before=${before}` : '');
            const mRes = await cwFetch(token, url);
            if (!mRes.ok) { log('mensagens falharam', { conversa: c.id, status: mRes.status }); break; }
            const mPayload = await mRes.json();
            const msgs: CwMessage[] = mPayload?.payload ?? mPayload?.data?.payload ?? [];
            if (!Array.isArray(msgs) || msgs.length === 0) break;

            const linhas = msgs.map((m) => ({
              organization_id: org.id,
              conversation_id: convRow.id,
              chatwoot_message_id: m.id,
              direction: direcao(m.message_type),
              content: m.content ?? null,
              sender_name: m.sender?.name ?? m.sender?.available_name ?? null,
              message_type: String(m.message_type ?? ''),
              is_private: m.private === true,
              attachments: (m.attachments ?? []) as unknown[],
              sent_at: quando(m.created_at),
              raw: m,
            }));

            const { error: mErr } = await admin
              .from('chatwoot_archive_messages')
              .upsert(linhas, { onConflict: 'conversation_id,chatwoot_message_id' });
            if (mErr) { log('mensagens não guardadas', { conversa: c.id, erro: mErr.message }); break; }

            mensagens += linhas.length;
            guardadasNesta += linhas.length;

            const maisAntiga = Math.min(...msgs.map((m) => Number(m.id)));
            if (msgs.length < 20 || maisAntiga === before) break;
            before = maisAntiga;
          }

          await admin.from('chatwoot_archive_conversations')
            .update({ message_count: guardadasNesta })
            .eq('id', convRow.id);
        }

        pagina++;
      }
    } catch (e) {
      erro = (e as Error).message;
      log('passagem interrompida', { org: org.name, erro });
    }

    await admin.from('chatwoot_archive_runs').update({
      status: erro ? 'error' : (acabou ? 'done' : 'partial'),
      conversations_seen: conversas,
      messages_saved: mensagens,
      last_page: pagina - 1,
      error: erro,
      finished_at: new Date().toISOString(),
    }).eq('id', run?.id ?? '');

    resumo.push({
      org: org.name,
      conta: accountId,
      conversas,
      mensagens,
      pagina_seguinte: acabou ? null : pagina,
      estado: erro ? 'erro' : (acabou ? 'completo' : 'a meio — volta a chamar'),
      erro,
    });
  }

  return json({ ok: true, resumo });
});
