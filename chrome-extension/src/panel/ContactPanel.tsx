import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveContact, DetectDiag, PairedSession } from '../lib/protocol';
import { CRM_ORIGIN } from './supabase';
import { Diag } from './Diag';
import { getOverride, setOverride as setOverrideStored } from './overrides';
import { getCached, getCachedPhone, invalidate, setCached, setCachedPhone } from './cache';
import { ConversationActions } from './ConversationActions';
import { dropWarm, getWarm } from './warm';
import {
  acceptTask,
  addNote,
  addTask,
  createLead,
  deleteTask,
  fetchDeals,
  fetchNotes,
  fetchTasks,
  findConversation,
  findCrmMatch,
  resolvePhoneFromSenvia,
  toggleTask,
  type ContactNote,
  type ConvRow,
  type CrmMatch,
  type DealRow,
  type InboxTask,
} from './data';

const dateFmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' });
const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });

function openInCrm(path: string) {
  window.open(`${CRM_ORIGIN}${path}`, '_blank', 'noopener');
}

export function ContactPanel({
  contact,
  session,
  diag,
}: {
  contact: ActiveContact;
  session: PairedSession;
  diag?: DetectDiag | null;
}) {
  const orgId = session.organizationId;
  // Seed from cache so a revisited chat paints on the first frame, with no
  // spinner. The refresh below still runs and swaps in fresher data.
  const seed = getCached(contact.jid);

  const [match, setMatch] = useState<CrmMatch | null>(seed?.match ?? null);
  // WhatsApp doesn't always expose the number (saved contacts show a name). In
  // that case Senvia's conversation list or the CRM record supplies it — and
  // notes/tasks are keyed by phone, so everything downstream needs this rather
  // than contact.phone.
  const [phone, setPhone] = useState(seed?.phone || contact.phone);
  const [notes, setNotes] = useState<ContactNote[]>(seed?.notes ?? []);
  const [tasks, setTasks] = useState<InboxTask[]>(seed?.tasks ?? []);
  const [deals, setDeals] = useState<{ proposals: DealRow[]; sales: DealRow[] }>(
    seed?.deals ?? { proposals: [], sales: [] },
  );
  const [loading, setLoading] = useState(!seed);
  const [error, setError] = useState<string | null>(null);
  const [conv, setConv] = useState<ConvRow | null>(null);

  const [noteDraft, setNoteDraft] = useState('');
  const [taskDraft, setTaskDraft] = useState('');
  const [busy, setBusy] = useState(false);
  // Manual number, for the chats detection can't crack.
  const [override, setOverride] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState('');

  // The header name flickers — WhatsApp swaps in "online", "a escrever…",
  // "visto por último" as presence changes. Keeping it in a ref means those
  // wobbles can't retrigger load() and make the panel reload constantly.
  const nameRef = useRef(contact.name);
  nameRef.current = contact.name;

  /** Increments per load() call so a superseded run can bail before painting. */
  const runRef = useRef(0);

  // A manual number, once set, outranks detection for this conversation.
  useEffect(() => {
    let cancelled = false;
    void getOverride(contact.jid).then((v) => {
      if (!cancelled) setOverride(v);
    });
    return () => {
      cancelled = true;
    };
  }, [contact.jid]);

  const load = useCallback(async () => {
    // Wait for the override lookup — starting without it would query the CRM
    // with the wrong key and flash the wrong record.
    if (override === null) return;

    // Runs overlap: the number can resolve mid-flight and retrigger this, and
    // the agent can switch chats at any point. Without a token the slower run
    // finishes last and wins — painting a previous contact's data over the
    // current one AND writing it into the cache under the wrong key, which then
    // survives as a wrong "instant" paint on the next visit.
    const run = ++runRef.current;
    const superseded = () => runRef.current !== run;

    // Only show the spinner on a cold contact — a revisit already has something
    // on screen and should refresh silently underneath.
    if (!getCached(contact.jid)) setLoading(true);
    setError(null);
    try {
      // Senvia's own conversation list is the authoritative answer to "what
      // number is this chat?" — Chatwoot hands it over, which is exactly why
      // the CRM inbox never has to guess. Ask it before falling back to
      // matching the CRM by name.
      let known = override || contact.phone || getCachedPhone(contact.jid);
      if (!known) {
        known = await resolvePhoneFromSenvia(orgId, nameRef.current);
        if (known) setCachedPhone(contact.jid, known);
      }

      // Paint from the bulk warm-up index before touching the network. This is
      // what makes a never-before-opened chat appear instantly instead of
      // waiting on its own round trip.
      if (superseded()) return;

      if (known) {
        const warm = getWarm(known);
        if (warm) {
          setPhone(known);
          setMatch(warm.match);
          setNotes(warm.notes);
          setTasks(warm.tasks);
          setLoading(false);
          void findConversation(orgId, known).then((c) => {
            if (!superseded()) setConv(c);
          });
        }
      }

      let m: CrmMatch | null;
      let n: ContactNote[];
      let t: InboxTask[];

      if (known) {
        // The number is the key for all three, so fire them together.
        [m, n, t] = await Promise.all([
          findCrmMatch(orgId, known, nameRef.current),
          fetchNotes(orgId, known),
          fetchTasks(orgId, known),
        ]);
      } else {
        // Last resort: match the CRM by name, and take the number from there.
        m = await findCrmMatch(orgId, '', nameRef.current);
        const derived = m?.phone ?? '';
        [n, t] = await Promise.all([fetchNotes(orgId, derived), fetchTasks(orgId, derived)]);
      }

      if (superseded()) return;

      const resolved = known || m?.phone || '';
      if (resolved) {
        void findConversation(orgId, resolved).then((c) => {
          if (!superseded()) setConv(c);
        });
      }
      setMatch(m);
      setPhone(resolved);
      setNotes(n);
      setTasks(t);
      setLoading(false);

      // Deals are secondary — don't hold the first paint for them.
      const d = m?.kind === 'client' ? await fetchDeals(m.id) : { proposals: [], sales: [] };
      if (superseded()) return;
      setDeals(d);
      setCached(contact.jid, { phone: resolved, match: m, notes: n, tasks: t, deals: d });
    } catch (e) {
      if (!superseded()) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!superseded()) setLoading(false);
    }
  }, [orgId, contact.jid, contact.phone, override]);

  // Reload whenever the agent switches conversation.
  useEffect(() => {
    void load();
  }, [load]);

  const submitNote = async () => {
    const text = noteDraft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await addNote(orgId, phone, text, session.userEmail);
      setNoteDraft('');
      invalidate(contact.jid);
      dropWarm(phone);
      setNotes(await fetchNotes(orgId, phone));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submitTask = async () => {
    const text = taskDraft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await addTask(orgId, phone, text, contact.name, match);
      setTaskDraft('');
      invalidate(contact.jid);
      dropWarm(phone);
      setTasks(await fetchTasks(orgId, phone));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const decideSuggestion = async (t: InboxTask, accept: boolean) => {
    if (busy) return;
    setBusy(true);
    // Optimistic: the suggestion should leave the list on click either way.
    setTasks((prev) =>
      accept
        ? prev.map((x) => (x.id === t.id ? { ...x, suggested: false } : x))
        : prev.filter((x) => x.id !== t.id),
    );
    try {
      await (accept ? acceptTask(t.id) : deleteTask(t.id));
      invalidate(contact.jid);
      dropWarm(phone);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTasks(await fetchTasks(orgId, phone));
    } finally {
      setBusy(false);
    }
  };

  const flipTask = async (t: InboxTask) => {
    // Optimistic — the checkbox should feel instant.
    const done = !t.done_at;
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done_at: done ? new Date().toISOString() : null } : x)));
    try {
      await toggleTask(t.id, done);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      invalidate(contact.jid);
      dropWarm(phone);
      setTasks(await fetchTasks(orgId, phone));
    }
  };

  const saveOverride = async () => {
    const digits = phoneDraft.replace(/\D/g, '');
    if (digits.length < 9 || busy) return;
    setBusy(true);
    try {
      await setOverrideStored(contact.jid, digits);
      setPhoneDraft('');
      setOverride(digits); // triggers a reload through the load() dependency
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const makeLead = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await createLead(orgId, contact.name || phone, phone);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // `suggested: true` means the AI proposed it and nobody has decided yet — the
  // CRM keeps those separate, behind Aceitar/Ignorar. Mixing them into the real
  // list makes the panel show work that was never actually committed to.
  const suggestions = tasks.filter((t) => t.suggested && !t.done_at);
  const openTasks = tasks.filter((t) => !t.suggested && !t.done_at);
  const doneTasks = tasks.filter((t) => t.done_at);
  // Notes and tasks are filed under the phone number — without one there's
  // nothing to attach them to.
  const canWrite = phone.replace(/\D/g, '').length >= 9;

  return (
    <div className="body">
      {error && <div className="err">{error}</div>}

      {/* --- Contact / CRM record --- */}
      <div className="card">
        <div className="row">
          <div className="grow">
            <p className="name">{match?.name || contact.name || 'Sem nome'}</p>
            <p className="sub">{phone ? `+${phone}` : 'número não exposto pelo WhatsApp'}</p>
          </div>
          {match && <span className={`badge ${match.kind}`}>{match.kind === 'client' ? 'Cliente' : 'Lead'}</span>}
        </div>

        {loading ? (
          <p className="small muted" style={{ marginTop: 8 }}>A carregar…</p>
        ) : match ? (
          <>
            {(match.status || match.value != null) && (
              <p className="small muted" style={{ marginTop: 6 }}>
                {match.status && <>Estado: {match.status}</>}
                {match.status && match.value != null && ' · '}
                {match.value != null && <>Valor: {eur.format(match.value)}</>}
              </p>
            )}
            {match.matchedBy === 'name' && (
              <p className="small muted" style={{ marginTop: 6 }}>
                Encontrado pelo nome — o WhatsApp não expôs o número desta conversa.
              </p>
            )}
            <div className="row wrap" style={{ marginTop: 8, gap: 6 }}>
              <button
                onClick={() =>
                  openInCrm(match.kind === 'client' ? `/clients?highlight=${match.id}` : `/leads?lead=${match.id}`)
                }
              >
                Abrir ficha
              </button>
              {phone && <button onClick={() => openInCrm(`/inbox?phone=${phone}`)}>Abrir no Senvia</button>}
            </div>
          </>
        ) : (
          <div style={{ marginTop: 8 }}>
            <p className="small muted" style={{ margin: '0 0 8px' }}>
              {phone
                ? 'Este número não está no CRM.'
                : 'Sem correspondência no CRM por nome, e o WhatsApp não expôs o número.'}
            </p>
            {phone && (
              <button className="primary" onClick={makeLead} disabled={busy}>
                Criar lead
              </button>
            )}
          </div>
        )}

        {/* Escape hatch: detection can't cover every chat (business accounts,
            privacy ids, stored names that differ from the header). Typing the
            number once unlocks everything and is remembered for this chat. */}
        {!phone && !loading && (
          <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <p className="small muted" style={{ margin: '0 0 6px' }}>
              Não consegui detetar o número. Escreve-o e fica guardado para esta conversa.
            </p>
            <div className="row">
              <input
                type="text"
                className="grow"
                value={phoneDraft}
                placeholder="+351 912 345 678"
                onChange={(e) => setPhoneDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void saveOverride();
                  }
                }}
              />
              <button
                className="primary"
                disabled={phoneDraft.replace(/\D/g, '').length < 9 || busy}
                onClick={saveOverride}
              >
                Guardar
              </button>
            </div>
            <Diag diag={diag ?? null} />
          </div>
        )}
      </div>

      {/* --- Conversation actions (Chatwoot-backed, so only when matched) --- */}
      {conv && (
        <ConversationActions
          orgId={orgId}
          conv={conv}
          onChanged={() => invalidate(contact.jid)}
        />
      )}

      {/* --- Notes --- */}
      <div className="card">
        <h3>
          Notas {notes.length > 0 && <span className="count">{notes.length}</span>}
        </h3>
        <div className="stack" style={{ marginBottom: 8 }}>
          <textarea
            rows={2}
            value={noteDraft}
            disabled={!canWrite}
            placeholder={
              canWrite ? 'Escreve uma nota… (Ctrl+Enter guarda)' : 'Define o número acima para guardar notas'
            }
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void submitNote();
              }
            }}
          />
          <button
            className="primary"
            style={{ alignSelf: 'flex-end' }}
            disabled={!canWrite || !noteDraft.trim() || busy}
            onClick={submitNote}
          >
            Adicionar
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="small muted">Ainda não há notas.</p>
        ) : (
          <div className="stack">
            {notes.map((n) => (
              <div key={n.id} className="note">
                <p>{n.content}</p>
                <div className="meta">
                  <span>{n.author_name || 'Equipa'}</span>
                  <span>
                    {dateFmt.format(new Date(n.created_at))} {timeFmt.format(new Date(n.created_at))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Tasks --- */}
      <div className="card">
        <h3>
          Tarefas {openTasks.length > 0 && <span className="count">{openTasks.length}</span>}
        </h3>
        <div className="row" style={{ marginBottom: 8 }}>
          <input
            type="text"
            className="grow"
            value={taskDraft}
            disabled={!canWrite}
            placeholder={canWrite ? 'Nova tarefa…' : 'Define o número acima para criar tarefas'}
            onChange={(e) => setTaskDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void submitTask();
              }
            }}
          />
          <button className="primary" disabled={!canWrite || !taskDraft.trim() || busy} onClick={submitTask}>
            +
          </button>
        </div>
        {/* Pending AI suggestions — proposals, not commitments. */}
        {suggestions.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {suggestions.map((t) => (
              <div key={t.id} className="suggestion">
                <div className="row" style={{ alignItems: 'flex-start', gap: 6 }}>
                  <span className="sugg">IA</span>
                  <span className="grow">{t.title}</span>
                </div>
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <button className="primary" disabled={busy} onClick={() => void decideSuggestion(t, true)}>
                    Aceitar
                  </button>
                  <button disabled={busy} onClick={() => void decideSuggestion(t, false)}>
                    Ignorar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {openTasks.length === 0 && suggestions.length === 0 ? (
          <p className="small muted">Sem tarefas — adiciona uma para não esqueceres o combinado.</p>
        ) : (
          <div>
            {openTasks.map((t) => {
              const overdue = !!t.due_at && new Date(t.due_at).getTime() < Date.now();
              return (
                <label key={t.id} className="task">
                  <input type="checkbox" checked={false} onChange={() => void flipTask(t)} />
                  <span className="grow">
                    <span className="title">{t.title}</span>
                    {t.due_at && (
                      <span className={`due ${overdue ? 'overdue' : ''}`}>
                        {' · '}
                        {dateFmt.format(new Date(t.due_at))} {timeFmt.format(new Date(t.due_at))}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {/* Completed work is history — collapsed, like the CRM does. */}
        {doneTasks.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary className="small muted" style={{ cursor: 'pointer' }}>
              Concluídas ({doneTasks.length})
            </summary>
            <div style={{ marginTop: 4 }}>
              {doneTasks.map((t) => (
                <label key={t.id} className="task done">
                  <input type="checkbox" checked onChange={() => void flipTask(t)} />
                  <span className="grow">
                    <span className="title">{t.title}</span>
                  </span>
                </label>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* --- Proposals / sales (clients only) --- */}
      {match?.kind === 'client' && (deals.proposals.length > 0 || deals.sales.length > 0) && (
        <div className="card">
          <h3>Propostas e vendas</h3>
          {deals.proposals.map((p) => (
            <div key={p.id} className="deal">
              <button className="link" onClick={() => openInCrm(`/proposals?proposal=${p.id}`)}>
                {p.code ? `Proposta ${p.code}` : 'Proposta'}
              </button>
              <span className="small muted">
                {p.status} {p.total_value != null && `· ${eur.format(p.total_value)}`}
              </span>
            </div>
          ))}
          {deals.sales.map((s) => (
            <div key={s.id} className="deal">
              <button className="link" onClick={() => openInCrm(`/sales?sale=${s.id}`)}>
                {s.code ? `Venda ${s.code}` : 'Venda'}
              </button>
              <span className="small muted">
                {s.status} {s.total_value != null && `· ${eur.format(s.total_value)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
