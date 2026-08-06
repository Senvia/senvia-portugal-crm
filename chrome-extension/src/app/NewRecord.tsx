import { useState, type ReactNode } from 'react';
import {
  createClient,
  createEvent,
  createExpense,
  createLead,
  type NewClient,
  type NewEvent,
  type NewExpense,
  type NewLead,
} from './data';

/**
 * Inline creation forms.
 *
 * Deliberately a panel that pushes the list down rather than a modal: the agent
 * is already inside an overlay on top of WhatsApp, and stacking a dialog on
 * that gets confusing about which Escape closes what.
 */
function Form({
  title,
  children,
  onCancel,
  onSubmit,
  busy,
  error,
  canSubmit,
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | null;
  canSubmit: boolean;
}) {
  return (
    <div className="form-card">
      <h3 className="form-title">{title}</h3>
      {error && <p className="err">{error}</p>}
      <div className="form-grid">{children}</div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <button onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button className="primary" onClick={onSubmit} disabled={busy || !canSubmit}>
          {busy ? 'A guardar…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Shared submit wrapper: one place for busy/error handling. */
function useSubmit(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, submit };
}

export function NewLeadForm({
  orgId,
  onCancel,
  onDone,
}: {
  orgId: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState<NewLead & { valueText: string }>({
    name: '',
    phone: '',
    email: '',
    valueText: '',
  });
  const { busy, error, submit } = useSubmit(onDone);
  const canSubmit = f.name.trim().length > 1 && f.phone.replace(/\D/g, '').length >= 9;

  return (
    <Form
      title="Nova lead"
      onCancel={onCancel}
      busy={busy}
      error={error}
      canSubmit={canSubmit}
      onSubmit={() =>
        submit(() =>
          createLead(orgId, {
            name: f.name,
            phone: f.phone,
            email: f.email,
            value: f.valueText ? Number(f.valueText.replace(',', '.')) : null,
          }),
        )
      }
    >
      <Field label="Nome">
        <input type="text" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
      </Field>
      <Field label="Telefone">
        <input
          type="text"
          value={f.phone}
          placeholder="+351 912 345 678"
          onChange={(e) => setF({ ...f, phone: e.target.value })}
        />
      </Field>
      <Field label="Email">
        <input type="text" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </Field>
      <Field label="Valor (€)">
        <input
          type="text"
          inputMode="decimal"
          value={f.valueText}
          onChange={(e) => setF({ ...f, valueText: e.target.value })}
        />
      </Field>
    </Form>
  );
}

export function NewClientForm({
  orgId,
  onCancel,
  onDone,
}: {
  orgId: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState<NewClient>({ name: '', phone: '', email: '', nif: '' });
  const { busy, error, submit } = useSubmit(onDone);
  const canSubmit = (f.name ?? '').trim().length > 1;

  return (
    <Form
      title="Novo cliente"
      onCancel={onCancel}
      busy={busy}
      error={error}
      canSubmit={canSubmit}
      onSubmit={() => submit(() => createClient(orgId, f))}
    >
      <Field label="Nome">
        <input type="text" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
      </Field>
      <Field label="Telefone">
        <input type="text" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </Field>
      <Field label="Email">
        <input type="text" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </Field>
      <Field label="NIF">
        <input type="text" value={f.nif} onChange={(e) => setF({ ...f, nif: e.target.value })} />
      </Field>
    </Form>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export function NewExpenseForm({
  orgId,
  onCancel,
  onDone,
}: {
  orgId: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState<{ description: string; amountText: string; date: string; recurring: boolean }>({
    description: '',
    amountText: '',
    date: today(),
    recurring: false,
  });
  const { busy, error, submit } = useSubmit(onDone);
  const amount = Number(f.amountText.replace(',', '.'));
  const canSubmit = f.description.trim().length > 1 && Number.isFinite(amount) && amount > 0;

  return (
    <Form
      title="Nova despesa"
      onCancel={onCancel}
      busy={busy}
      error={error}
      canSubmit={canSubmit}
      onSubmit={() =>
        submit(() =>
          createExpense(orgId, {
            description: f.description,
            amount,
            expense_date: f.date,
            is_recurring: f.recurring,
          } satisfies NewExpense),
        )
      }
    >
      <Field label="Descrição">
        <input
          type="text"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          autoFocus
        />
      </Field>
      <Field label="Valor (€)">
        <input
          type="text"
          inputMode="decimal"
          value={f.amountText}
          onChange={(e) => setF({ ...f, amountText: e.target.value })}
        />
      </Field>
      <Field label="Data">
        <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </Field>
      <Field label="Recorrente">
        <input
          type="checkbox"
          checked={f.recurring}
          onChange={(e) => setF({ ...f, recurring: e.target.checked })}
        />
      </Field>
    </Form>
  );
}

/** Local datetime for `<input type="datetime-local">`, which has no timezone. */
const inOneHour = () => {
  const d = new Date(Date.now() + 3600_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function NewEventForm({
  orgId,
  onCancel,
  onDone,
}: {
  orgId: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState({ title: '', when: inOneHour(), type: 'meeting', description: '' });
  const { busy, error, submit } = useSubmit(onDone);
  const canSubmit = f.title.trim().length > 1 && !!f.when;

  return (
    <Form
      title="Novo evento"
      onCancel={onCancel}
      busy={busy}
      error={error}
      canSubmit={canSubmit}
      onSubmit={() =>
        submit(() =>
          createEvent(orgId, {
            title: f.title,
            // datetime-local is local wall time; toISOString converts to UTC,
            // which is what the column stores.
            start_time: new Date(f.when).toISOString(),
            event_type: f.type,
            description: f.description,
          } satisfies NewEvent),
        )
      }
    >
      <Field label="Título">
        <input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus />
      </Field>
      <Field label="Quando">
        <input type="datetime-local" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} />
      </Field>
      <Field label="Tipo">
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="meeting">Reunião</option>
          <option value="call">Chamada</option>
          <option value="follow_up">Follow-up</option>
          <option value="task">Tarefa</option>
        </select>
      </Field>
      <Field label="Notas">
        <input
          type="text"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </Field>
    </Form>
  );
}
