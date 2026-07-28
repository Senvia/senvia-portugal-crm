import { useEffect, useState } from 'react';
import {
  assignConversation,
  listLabels,
  listTeam,
  setConversationLabels,
  toggleConversationStatus,
  type ConvRow,
  type TeamMember,
} from './data';

/**
 * Conversation-scoped actions — assign, labels, archive.
 *
 * These live in Chatwoot rather than Supabase, so they need the conversation
 * id. That's why they only appear once the chat has been matched to a Senvia
 * conversation; a WhatsApp chat that never reached Chatwoot has nothing to act
 * on.
 */
export function ConversationActions({
  orgId,
  conv,
  onChanged,
}: {
  orgId: string;
  conv: ConvRow;
  onChanged: () => void;
}) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [labels, setLabels] = useState<{ id: number; title: string }[]>([]);
  const [applied, setApplied] = useState<string[]>(conv.labels);
  const [assigned, setAssigned] = useState<string | null>(conv.assignedId);
  const [status, setStatus] = useState<string | null>(conv.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listTeam(orgId), listLabels(orgId)]).then(([t, l]) => {
      if (cancelled) return;
      setTeam(t);
      setLabels(l);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const changeAssignee = (userId: string) =>
    run(async () => {
      const member = team.find((m) => m.user_id === userId) ?? null;
      await assignConversation(orgId, conv.id, userId || null, member?.full_name ?? null);
      setAssigned(userId || null);
    });

  const toggleLabel = (title: string) =>
    run(async () => {
      const next = applied.includes(title) ? applied.filter((l) => l !== title) : [...applied, title];
      await setConversationLabels(orgId, conv.id, next);
      setApplied(next);
    });

  const flipStatus = () =>
    run(async () => {
      const next = status === 'resolved' ? 'open' : 'resolved';
      await toggleConversationStatus(orgId, conv.id, next);
      setStatus(next);
    });

  return (
    <div className="card">
      <h3>Conversa</h3>

      {error && <div className="err" style={{ marginBottom: 8 }}>{error}</div>}

      <label className="small muted" style={{ display: 'block', marginBottom: 4 }}>
        Atribuir a
      </label>
      <select
        className="grow"
        style={{ width: '100%', marginBottom: 10 }}
        value={assigned ?? ''}
        disabled={busy}
        onChange={(e) => void changeAssignee(e.target.value)}
      >
        <option value="">Não atribuída</option>
        {team.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {m.full_name}
          </option>
        ))}
      </select>

      <label className="small muted" style={{ display: 'block', marginBottom: 4 }}>
        Etiquetas
      </label>
      <div className="row wrap" style={{ gap: 4, marginBottom: 10 }}>
        {labels.length === 0 && <span className="small muted">Sem etiquetas criadas.</span>}
        {labels.map((l) => {
          const on = applied.includes(l.title);
          return (
            <button
              key={l.id}
              type="button"
              disabled={busy}
              onClick={() => void toggleLabel(l.title)}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 999,
                background: on ? 'var(--accent)' : 'var(--bg)',
                color: on ? 'var(--accent-fg)' : 'var(--fg)',
                borderColor: on ? 'transparent' : 'var(--border)',
              }}
            >
              {l.title}
            </button>
          );
        })}
      </div>

      <button onClick={() => void flipStatus()} disabled={busy} style={{ width: '100%' }}>
        {status === 'resolved' ? 'Reabrir conversa' : 'Arquivar conversa'}
      </button>
    </div>
  );
}
