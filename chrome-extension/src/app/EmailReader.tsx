import { useMemo, useState } from 'react';
import {
  markEmailRead,
  replyReferences,
  replySubject,
  sendEmail,
  type EmailFull,
} from './data';

const dateTimeFmt = new Intl.DateTimeFormat('pt-PT', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Renders the message body in a sandboxed iframe.
 *
 * `sandbox` with no `allow-same-origin` means the email's markup gets a unique
 * opaque origin: no access to the extension page, no storage, no scripts. Mail
 * is untrusted content by definition, and this page holds a live Supabase
 * session — injecting the HTML directly would hand that session to anyone who
 * emails the agent.
 *
 * Remote images are left alone rather than blocked; they leak "message opened"
 * to the sender, which is the same trade-off the CRM's reader makes visible.
 */
function Body({ message }: { message: EmailFull }) {
  const srcDoc = useMemo(() => {
    const font = 'system-ui, -apple-system, "Segoe UI", sans-serif';
    const content = message.html_body
      ? message.html_body
      : `<pre style="white-space:pre-wrap;font:14px/1.6 ${font}">${escapeHtml(message.text_body ?? '')}</pre>`;
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
      <style>
        html,body{margin:0;padding:12px;font:14px/1.6 ${font};color:#1a1a1a;
          word-break:break-word;overflow-wrap:break-word;background:#fff}
        img{max-width:100%;height:auto}
        table{max-width:100%}
        a{color:#00a884}
      </style></head><body>${content}</body></html>`;
  }, [message.html_body, message.text_body]);

  if (!message.html_body && !message.text_body) {
    return (
      <p className="muted">
        {message.body_fetched
          ? 'Mensagem sem conteúdo.'
          : 'O conteúdo ainda não foi descarregado pelo gateway. Só as mensagens recentes são preenchidas automaticamente.'}
      </p>
    );
  }

  return <iframe className="mail-body" sandbox="" srcDoc={srcDoc} title="Conteúdo da mensagem" />;
}

export function EmailReader({
  orgId,
  message,
  onClose,
  onChanged,
}: {
  orgId: string;
  message: EmailFull;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const to = message.from_address
    ? [{ name: message.from_name ?? '', address: message.from_address }]
    : [];

  const submit = async () => {
    if (!text.trim() || !to.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Plain text typed by the agent, wrapped as HTML — the gateway sends
      // whatever html it's given.
      const html = escapeHtml(text.trim()).replace(/\n/g, '<br>');
      await sendEmail(orgId, message.channel_id, {
        to,
        subject: replySubject(message.subject),
        html,
        inReplyTo: message.message_id,
        references: replyReferences(message),
      });
      setSent(true);
      setText('');
      setReplying(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const markRead = async () => {
    try {
      await markEmailRead(orgId, message.channel_id, message.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="reader">
      <div className="reader-head">
        <div className="grow">
          <strong>{message.subject || '(sem assunto)'}</strong>
          <div className="muted small">
            {message.from_name || message.from_address}
            {message.from_name && message.from_address ? ` <${message.from_address}>` : ''}
            {message.date ? ` · ${dateTimeFmt.format(new Date(message.date))}` : ''}
          </div>
        </div>
        {!message.seen && (
          <button onClick={markRead} title="Marcar como lida">
            Marcar lida
          </button>
        )}
        <button onClick={onClose} title="Fechar">
          ✕
        </button>
      </div>

      {error && <p className="err">{error}</p>}
      {sent && (
        <p className="ok">
          Resposta em fila. O gateway envia-a em segundos — aparece depois em Enviados.
        </p>
      )}

      <Body message={message} />

      <div className="reader-foot">
        {!replying ? (
          <button className="primary" disabled={!to.length} onClick={() => setReplying(true)}>
            {to.length ? 'Responder' : 'Sem remetente para responder'}
          </button>
        ) : (
          <>
            <div className="muted small">
              Para: {to[0].name ? `${to[0].name} <${to[0].address}>` : to[0].address}
              {' · '}
              {replySubject(message.subject)}
            </div>
            <textarea
              rows={5}
              autoFocus
              value={text}
              placeholder="Escreve a resposta… (Ctrl+Enter envia)"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setReplying(false)} disabled={busy}>
                Cancelar
              </button>
              <button className="primary" onClick={submit} disabled={!text.trim() || busy}>
                {busy ? 'A enviar…' : 'Enviar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
