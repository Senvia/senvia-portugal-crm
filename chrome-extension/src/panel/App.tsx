import { useEffect, useState } from 'react';
import {
  CONTENT_SOURCE,
  PANEL_SOURCE,
  type ActiveContact,
  type ContentToPanel,
  type DetectDiag,
  type PairedSession,
} from '../lib/protocol';
import { CRM_ORIGIN, clearPairedSession, onPairingChanged, restoreSession } from './supabase';
import { ContactPanel } from './ContactPanel';
import { Diag } from './Diag';
import { prefetchConversations } from './data';
import { warmup } from './warm';

type Boot = 'loading' | 'unpaired' | 'expired' | 'ready';

export function App() {
  const [boot, setBoot] = useState<Boot>('loading');
  const [session, setSession] = useState<PairedSession | null>(null);
  const [contact, setContact] = useState<ActiveContact | null>(null);
  const [diag, setDiag] = useState<DetectDiag | null>(null);

  // Bootstrap the Supabase session from whatever the CRM tab handed over, and
  // re-run it whenever the pairing changes — clicking "Ligar extensão" happens
  // in a DIFFERENT tab, so without this the panel would keep showing the
  // pairing prompt until the WhatsApp tab was reloaded by hand.
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const { session: paired, expired } = await restoreSession();
      if (cancelled) return;
      setSession(paired);
      setBoot(paired ? 'ready' : expired ? 'expired' : 'unpaired');
      // Warm the conversation list now, so the first chat opened is already fast.
      if (paired) {
        prefetchConversations(paired.organizationId);
        void warmup(paired.organizationId);
      }
    };

    void boot();
    const off = onPairingChanged(() => void boot());
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  // Listen for chat changes from the content script, and announce we're up.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as ContentToPanel;
      if (data?.source !== CONTENT_SOURCE) return;
      if (data.type === 'CONTACT') {
        setContact(data.contact);
        setDiag(data.diag);
      }
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ source: PANEL_SOURCE, type: 'READY' }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const disconnect = async () => {
    await clearPairedSession();
    setSession(null);
    setBoot('unpaired');
  };

  return (
    <>
      <header className="head">
        <span className="brand">Senvia</span>
        {session && (
          <>
            <span className="org" title={session.organizationName ?? ''}>
              {session.organizationName ?? 'Organização'}
            </span>
            <button className="icon" title="Desligar extensão" onClick={disconnect}>
              ⏻
            </button>
          </>
        )}
      </header>

      {boot === 'loading' && <div className="empty">A carregar…</div>}

      {(boot === 'unpaired' || boot === 'expired') && (
        <div className="empty">
          <h2>{boot === 'expired' ? 'Sessão expirada' : 'Liga ao Senvia OS'}</h2>
          <p>
            {boot === 'expired'
              ? 'A ligação caducou por inatividade. Abre o Senvia e liga outra vez — o painel atualiza-se sozinho.'
              : 'Abre o Senvia, entra na tua conta e clica em “Ligar extensão”.'}
          </p>
          <button
            className="primary"
            onClick={() => window.open(`${CRM_ORIGIN}/extension-auth`, '_blank', 'noopener')}
          >
            Abrir Senvia OS
          </button>
        </div>
      )}

      {boot === 'ready' && session && <Content contact={contact} session={session} diag={diag} />}
    </>
  );
}

function Content({
  contact,
  session,
  diag,
}: {
  contact: ActiveContact | null;
  session: PairedSession;
  diag: DetectDiag | null;
}) {
  if (!contact) {
    return (
      <div className="empty">
        <h2>Nenhuma conversa aberta</h2>
        <p>Abre uma conversa no WhatsApp para veres a ficha do contacto.</p>
        <Diag diag={diag} />
      </div>
    );
  }
  if (contact.isGroup) {
    return (
      <div className="empty">
        <h2>Conversa de grupo</h2>
        <p>Os grupos não têm uma ficha de CRM associada.</p>
      </div>
    );
  }
  // No number AND no name means nothing to go on. With a name we can still
  // match the CRM record, and take the number from there.
  if (!contact.phone && !contact.name) {
    return (
      <div className="empty">
        <h2>Contacto não identificado</h2>
        <p>
          O WhatsApp não expõe o número nem o nome desta conversa
          {contact.isPrivacyId ? ' (modo de privacidade ativo)' : ''}, por isso não é possível
          encontrar a ficha no CRM.
        </p>
        <Diag diag={diag} />
      </div>
    );
  }
  // Remount on contact change so no state leaks between conversations.
  return <ContactPanel key={contact.jid} contact={contact} session={session} diag={diag} />;
}
