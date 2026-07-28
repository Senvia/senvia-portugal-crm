import { useEffect, useState } from 'react';
import {
  CONTENT_SOURCE,
  PANEL_SOURCE,
  type ActiveContact,
  type ContentToPanel,
  type PairedSession,
} from '../lib/protocol';
import { CRM_ORIGIN, clearPairedSession, restoreSession } from './supabase';
import { ContactPanel } from './ContactPanel';

type Boot = 'loading' | 'unpaired' | 'ready';

export function App() {
  const [boot, setBoot] = useState<Boot>('loading');
  const [session, setSession] = useState<PairedSession | null>(null);
  const [contact, setContact] = useState<ActiveContact | null>(null);

  // Bootstrap the Supabase session from whatever the CRM tab handed over.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const paired = await restoreSession();
      if (cancelled) return;
      setSession(paired);
      setBoot(paired ? 'ready' : 'unpaired');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for chat changes from the content script, and announce we're up.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as ContentToPanel;
      if (data?.source !== CONTENT_SOURCE) return;
      if (data.type === 'CONTACT') setContact(data.contact);
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

      {boot === 'unpaired' && (
        <div className="empty">
          <h2>Liga ao Senvia OS</h2>
          <p>Abre o Senvia, entra na tua conta e clica em “Ligar extensão”.</p>
          <button
            className="primary"
            onClick={() => window.open(`${CRM_ORIGIN}/extension-auth`, '_blank', 'noopener')}
          >
            Abrir Senvia OS
          </button>
        </div>
      )}

      {boot === 'ready' && session && <Content contact={contact} session={session} />}
    </>
  );
}

function Content({ contact, session }: { contact: ActiveContact | null; session: PairedSession }) {
  if (!contact) {
    return (
      <div className="empty">
        <h2>Nenhuma conversa aberta</h2>
        <p>Abre uma conversa no WhatsApp para veres a ficha do contacto.</p>
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
  if (contact.isPrivacyId || !contact.phone) {
    return (
      <div className="empty">
        <h2>Número indisponível</h2>
        <p>
          Este contacto usa o modo de privacidade do WhatsApp, que esconde o número. Sem número não é
          possível encontrar a ficha no CRM.
        </p>
      </div>
    );
  }
  // Remount on contact change so no state leaks between conversations.
  return <ContactPanel key={contact.jid} contact={contact} session={session} />;
}
