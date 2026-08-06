import { useEffect, useState } from 'react';
import {
  fetchFinance,
  listEmailChannels,
  listEmailFolders,
  listEmailMessages,
  listEvents,
  fetchEmailMessage,
  type EmailChannelRow,
  type EmailFolderRow,
  type EmailMessageRow,
  type EmailFull,
  type EventRow,
  type FinanceSummary,
} from './data';
import { useAsync } from './useAsync';
import { EmailReader } from './EmailReader';

const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const dayFmt = new Intl.DateTimeFormat('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });

const EVENT_LABEL: Record<string, string> = {
  meeting: 'Reunião',
  call: 'Chamada',
  follow_up: 'Follow-up',
  task: 'Tarefa',
};

// --- Agenda -----------------------------------------------------------------

export function Agenda({ orgId }: { orgId: string }) {
  const { data, loading, error } = useAsync<EventRow[]>(() => listEvents(orgId), [orgId]);

  if (loading) return <p className="muted">A carregar…</p>;
  if (error) return <p className="err">{error}</p>;
  if (!data?.length) return <p className="muted">Nada agendado a partir de hoje.</p>;

  // Group by day so the list reads like an agenda rather than a flat table.
  const days = new Map<string, EventRow[]>();
  for (const e of data) {
    const key = new Date(e.start_time).toDateString();
    const list = days.get(key);
    if (list) list.push(e);
    else days.set(key, [e]);
  }

  return (
    <div className="agenda">
      {[...days.entries()].map(([key, events]) => (
        <section key={key}>
          <h3 className="day">{dayFmt.format(new Date(key))}</h3>
          {events.map((e) => (
            <div key={e.id} className={`event ${e.status === 'cancelled' ? 'cancelled' : ''}`}>
              <span className="when">{e.all_day ? 'Todo o dia' : timeFmt.format(new Date(e.start_time))}</span>
              <span className="grow">
                <strong>{e.title}</strong>
                {e.description && <span className="muted"> — {e.description}</span>}
              </span>
              {e.event_type && <span className="chip">{EVENT_LABEL[e.event_type] ?? e.event_type}</span>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

// --- Financeiro ---------------------------------------------------------------

export function Financeiro({ orgId }: { orgId: string }) {
  const { data, loading, error } = useAsync<FinanceSummary>(() => fetchFinance(orgId), [orgId]);

  if (loading) return <p className="muted">A carregar…</p>;
  if (error) return <p className="err">{error}</p>;
  if (!data) return null;

  const balance = data.salesTotal - data.expensesTotal;

  return (
    <>
      <div className="tiles" style={{ marginBottom: 16 }}>
        <div className="tile">
          <span className="tile-label">Vendas</span>
          <strong className="tile-value">{eur.format(data.salesTotal)}</strong>
        </div>
        <div className="tile">
          <span className="tile-label">Despesas</span>
          <strong className="tile-value">{eur.format(data.expensesTotal)}</strong>
        </div>
        <div className="tile">
          <span className="tile-label">Diferença</span>
          <strong className="tile-value" style={{ color: balance < 0 ? 'var(--danger)' : undefined }}>
            {eur.format(balance)}
          </strong>
        </div>
      </div>

      {!data.expenses.length ? (
        <p className="muted">Sem despesas registadas.</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Data</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.expenses.map((e) => (
              <tr key={e.id}>
                <td>
                  {e.description}
                  {e.is_recurring && <span className="chip" style={{ marginLeft: 6 }}>recorrente</span>}
                </td>
                <td>{dateFmt.format(new Date(e.expense_date))}</td>
                <td className="num">{eur.format(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

// --- Caixa de Entrada (email) -------------------------------------------------

export function Emails({ orgId }: { orgId: string }) {
  const [channelId, setChannelId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const channels = useAsync<EmailChannelRow[]>(() => listEmailChannels(orgId), [orgId]);

  // Pick the first inbox, then its INBOX folder, without making the agent click
  // twice before seeing anything.
  useEffect(() => {
    if (!channelId && channels.data?.length) setChannelId(channels.data[0].id);
  }, [channels.data, channelId]);

  const folders = useAsync<EmailFolderRow[]>(
    () => (channelId ? listEmailFolders(channelId) : Promise.resolve([])),
    [channelId],
  );

  useEffect(() => {
    if (folderId || !folders.data?.length) return;
    const inbox = folders.data.find((f) => f.role === 'inbox') ?? folders.data[0];
    setFolderId(inbox.id);
  }, [folders.data, folderId]);

  const messages = useAsync<EmailMessageRow[]>(
    () => (folderId ? listEmailMessages(folderId) : Promise.resolve([])),
    [folderId],
  );

  // Full body and headers only when a message is actually opened — the list
  // query deliberately skips them, they're large.
  const opened = useAsync<EmailFull | null>(
    () => (openId ? fetchEmailMessage(openId) : Promise.resolve(null)),
    [openId],
  );

  if (channels.loading) return <p className="muted">A carregar…</p>;
  if (channels.error) return <p className="err">{channels.error}</p>;
  if (!channels.data?.length) {
    return <p className="muted">Nenhuma caixa de email ligada. Liga uma em Definições → Integrações.</p>;
  }

  return (
    <div className="mail">
      <aside className="mail-side">
        {channels.data.length > 1 && (
          <select
            value={channelId ?? ''}
            onChange={(e) => {
              setChannelId(e.target.value);
              setFolderId(null);
            }}
          >
            {channels.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || 'Caixa'}
              </option>
            ))}
          </select>
        )}
        {(folders.data ?? []).map((f) => (
          <button
            key={f.id}
            className={f.id === folderId ? 'folder active' : 'folder'}
            onClick={() => setFolderId(f.id)}
          >
            <span className="grow">{f.name}</span>
            {!!f.unread_count && <span className="chip">{f.unread_count}</span>}
          </button>
        ))}
      </aside>

      <div className="mail-list">
        {messages.error && <p className="err">{messages.error}</p>}
        {messages.loading ? (
          <p className="muted">A carregar…</p>
        ) : !messages.data?.length ? (
          <p className="muted">Pasta vazia.</p>
        ) : (
          messages.data.map((m) => (
            <button
              key={m.id}
              className={`mail-row ${m.seen ? '' : 'unread'} ${m.id === openId ? 'selected' : ''}`}
              onClick={() => setOpenId(m.id === openId ? null : m.id)}
            >
              <div className="row">
                <strong className="grow">{m.from_name || m.from_address || '—'}</strong>
                <span className="muted small">{m.date ? dateFmt.format(new Date(m.date)) : ''}</span>
              </div>
              <div className="subject">
                {m.subject || '(sem assunto)'}
                {m.has_attachments && <span className="chip" style={{ marginLeft: 6 }}>anexo</span>}
              </div>
              {m.snippet && <div className="muted small snippet">{m.snippet}</div>}
            </button>
          ))
        )}
      </div>

      {openId && (
        <div className="mail-reader">
          {opened.loading ? (
            <p className="muted">A abrir…</p>
          ) : opened.error ? (
            <p className="err">{opened.error}</p>
          ) : opened.data ? (
            <EmailReader
              orgId={orgId}
              message={opened.data}
              onClose={() => setOpenId(null)}
              onChanged={() => {
                void messages.reload();
                void opened.reload();
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
