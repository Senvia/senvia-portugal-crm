import { useCallback, useEffect, useState } from 'react';
import type { ActiveContact, PairedSession } from '../lib/protocol';
import { CRM_ORIGIN } from './supabase';
import {
  addNote,
  addTask,
  createLead,
  fetchDeals,
  fetchNotes,
  fetchTasks,
  findCrmMatch,
  toggleTask,
  type ContactNote,
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
}: {
  contact: ActiveContact;
  session: PairedSession;
}) {
  const orgId = session.organizationId;
  const phone = contact.phone;

  const [match, setMatch] = useState<CrmMatch | null>(null);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tasks, setTasks] = useState<InboxTask[]>([]);
  const [deals, setDeals] = useState<{ proposals: DealRow[]; sales: DealRow[] }>({ proposals: [], sales: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [noteDraft, setNoteDraft] = useState('');
  const [taskDraft, setTaskDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, n, t] = await Promise.all([
        findCrmMatch(orgId, phone),
        fetchNotes(orgId, phone),
        fetchTasks(orgId, phone),
      ]);
      setMatch(m);
      setNotes(n);
      setTasks(t);
      setDeals(m?.kind === 'client' ? await fetchDeals(m.id) : { proposals: [], sales: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [orgId, phone]);

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
      setTasks(await fetchTasks(orgId, phone));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
      setTasks(await fetchTasks(orgId, phone));
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

  const openTasks = tasks.filter((t) => !t.done_at);
  const doneTasks = tasks.filter((t) => t.done_at);

  return (
    <div className="body">
      {error && <div className="err">{error}</div>}

      {/* --- Contact / CRM record --- */}
      <div className="card">
        <div className="row">
          <div className="grow">
            <p className="name">{match?.name || contact.name || 'Sem nome'}</p>
            <p className="sub">+{phone}</p>
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
            <div className="row wrap" style={{ marginTop: 8, gap: 6 }}>
              <button
                onClick={() =>
                  openInCrm(match.kind === 'client' ? `/clients?highlight=${match.id}` : `/leads?lead=${match.id}`)
                }
              >
                Abrir ficha
              </button>
              <button onClick={() => openInCrm(`/inbox?phone=${phone}`)}>Abrir no Senvia</button>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 8 }}>
            <p className="small muted" style={{ margin: '0 0 8px' }}>
              Este número não está no CRM.
            </p>
            <button className="primary" onClick={makeLead} disabled={busy}>
              Criar lead
            </button>
          </div>
        )}
      </div>

      {/* --- Notes --- */}
      <div className="card">
        <h3>
          Notas {notes.length > 0 && <span className="count">{notes.length}</span>}
        </h3>
        <div className="stack" style={{ marginBottom: 8 }}>
          <textarea
            rows={2}
            value={noteDraft}
            placeholder="Escreve uma nota… (Ctrl+Enter guarda)"
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void submitNote();
              }
            }}
          />
          <button className="primary" style={{ alignSelf: 'flex-end' }} disabled={!noteDraft.trim() || busy} onClick={submitNote}>
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
            placeholder="Nova tarefa…"
            onChange={(e) => setTaskDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void submitTask();
              }
            }}
          />
          <button className="primary" disabled={!taskDraft.trim() || busy} onClick={submitTask}>
            +
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="small muted">Sem tarefas para este contacto.</p>
        ) : (
          <div>
            {[...openTasks, ...doneTasks].map((t) => {
              const overdue = !t.done_at && !!t.due_at && new Date(t.due_at).getTime() < Date.now();
              return (
                <label key={t.id} className={`task ${t.done_at ? 'done' : ''}`}>
                  <input type="checkbox" checked={!!t.done_at} onChange={() => void flipTask(t)} />
                  <span className="grow">
                    <span className="title">{t.title}</span>{' '}
                    {t.suggested && <span className="sugg">IA</span>}
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
