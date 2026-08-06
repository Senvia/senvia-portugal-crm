import { useState } from 'react';
import {
  fetchFinance,
  listEvents,
  type EventRow,
  type FinanceSummary,
} from './data';
import { useAsync } from './useAsync';
import { NewEventForm, NewExpenseForm } from './NewRecord';

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
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useAsync<EventRow[]>(() => listEvents(orgId), [orgId]);

  // Group by day so the list reads like an agenda rather than a flat table.
  const days = new Map<string, EventRow[]>();
  for (const e of data ?? []) {
    const key = new Date(e.start_time).toDateString();
    const list = days.get(key);
    if (list) list.push(e);
    else days.set(key, [e]);
  }

  return (
    <div className="agenda">
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="primary" onClick={() => setCreating(true)} disabled={creating}>
          + Novo evento
        </button>
      </div>
      {creating && (
        <NewEventForm
          orgId={orgId}
          onCancel={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            void reload();
          }}
        />
      )}
      {error && <p className="err">{error}</p>}
      {loading && <p className="muted">A carregar…</p>}
      {!loading && !days.size && <p className="muted">Nada agendado a partir de hoje.</p>}
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
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useAsync<FinanceSummary>(() => fetchFinance(orgId), [orgId]);

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

      <div className="row" style={{ marginBottom: 12 }}>
        <button className="primary" onClick={() => setCreating(true)} disabled={creating}>
          + Nova despesa
        </button>
      </div>
      {creating && (
        <NewExpenseForm
          orgId={orgId}
          onCancel={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            void reload();
          }}
        />
      )}

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
