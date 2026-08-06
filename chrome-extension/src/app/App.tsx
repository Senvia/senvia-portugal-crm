import { useEffect, useState } from 'react';
import type { PairedSession } from '../lib/protocol';
import { onPairingChanged, restoreSession } from '../panel/supabase';
import {
  fetchTotals,
  listClients,
  listLeads,
  listProposals,
  listSales,
  type ClientRow,
  type DealListRow,
  type LeadRow,
  type Totals,
} from './data';
import { useAsync } from './useAsync';
import { Agenda, Financeiro } from './screens';
import { NewClientForm, NewLeadForm } from './NewRecord';
import './styles.css';

// The CRM rendered INSIDE the extension.
//
// The real app can't be iframed into WhatsApp Web — their CSP `frame-src`
// allowlist blocks third-party frames and Chrome enforces it on nested frames
// too. But an extension page is exempt, which is why the contact panel has
// always worked. So instead of embedding the site, these screens query the same
// Supabase tables directly, under the agent's own JWT and RLS.

const SECTIONS = [
  { key: 'dashboard', label: 'Painel' },
  { key: 'leads', label: 'Leads' },
  { key: 'clients', label: 'Clientes' },
  { key: 'proposals', label: 'Propostas' },
  { key: 'sales', label: 'Vendas' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'financeiro', label: 'Financeiro' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const dateFmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });

const fmtDate = (v: string | null) => (v ? dateFmt.format(new Date(v)) : '—');
const CRM_ORIGIN = 'https://app.senvia.pt';

export function App() {
  const [session, setSession] = useState<PairedSession | null>(null);
  const [booted, setBooted] = useState(false);
  const [section, setSection] = useState<SectionKey>(
    () => (new URLSearchParams(location.search).get('s') as SectionKey) || 'dashboard',
  );

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const { session: paired } = await restoreSession();
      if (cancelled) return;
      setSession(paired);
      setBooted(true);
    };
    void boot();
    const off = onPairingChanged(() => void boot());
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  // The rail lives in the WhatsApp page, so section changes arrive by message.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { source?: string; type?: string; section?: string };
      if (d?.source !== 'senvia-content' || d.type !== 'APP_SECTION' || !d.section) return;
      if (SECTIONS.some((s) => s.key === d.section)) setSection(d.section as SectionKey);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const close = () => window.parent.postMessage({ source: 'senvia-app', type: 'CLOSE' }, '*');

  if (!booted) return <div className="app-empty">A carregar…</div>;
  if (!session) {
    return (
      <div className="app-empty">
        <h2>Liga ao Senvia OS</h2>
        <p>Abre o Senvia, entra na tua conta e clica em “Ligar extensão”.</p>
        <button className="primary" onClick={() => window.open(`${CRM_ORIGIN}/extension-auth`, '_blank', 'noopener')}>
          Abrir Senvia OS
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-head">
        <nav className="tabs">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={s.key === section ? 'tab active' : 'tab'}
              onClick={() => setSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <span className="app-org">{session.organizationName ?? ''}</span>
        <button className="close" onClick={close} title="Voltar ao WhatsApp">
          ✕ WhatsApp
        </button>
      </header>

      <main className="app-body">
        {section === 'dashboard' && <Dashboard orgId={session.organizationId} />}
        {section === 'leads' && <Leads orgId={session.organizationId} />}
        {section === 'clients' && <Clients orgId={session.organizationId} />}
        {section === 'proposals' && <Deals orgId={session.organizationId} kind="proposals" />}
        {section === 'sales' && <Deals orgId={session.organizationId} kind="sales" />}
        {section === 'agenda' && <Agenda orgId={session.organizationId} />}
        {section === 'financeiro' && <Financeiro orgId={session.organizationId} />}
      </main>
    </div>
  );
}

function Dashboard({ orgId }: { orgId: string }) {
  const { data, loading, error } = useAsync<Totals>(() => fetchTotals(orgId), [orgId]);
  if (loading) return <p className="muted">A carregar…</p>;
  if (error) return <p className="err">{error}</p>;
  if (!data) return null;

  const tiles = [
    { label: 'Leads ativas', value: String(data.leads) },
    { label: 'Clientes', value: String(data.clients) },
    { label: 'Propostas em aberto', value: String(data.openProposals) },
    { label: 'Valor de vendas', value: eur.format(data.salesValue) },
  ];

  return (
    <div className="tiles">
      {tiles.map((t) => (
        <div key={t.label} className="tile">
          <span className="tile-label">{t.label}</span>
          <strong className="tile-value">{t.value}</strong>
        </div>
      ))}
    </div>
  );
}

/** Search box shared by the list screens. */
function Search({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      className="search"
      value={value}
      placeholder="Procurar por nome, telefone ou email…"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Leads({ orgId }: { orgId: string }) {
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const { data, loading, error, reload } = useAsync<LeadRow[]>(() => listLeads(orgId, debounced), [orgId, debounced]);

  return (
    <>
      <div className="row" style={{ marginBottom: 12, gap: 10 }}>
        <Search value={q} onChange={setQ} />
        <button className="primary" onClick={() => setCreating(true)} disabled={creating}>
          + Nova lead
        </button>
      </div>
      {creating && (
        <NewLeadForm
          orgId={orgId}
          onCancel={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            void reload();
          }}
        />
      )}
      {error && <p className="err">{error}</p>}
      {loading ? (
        <p className="muted">A carregar…</p>
      ) : !data?.length ? (
        <p className="muted">Sem leads.</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Estado</th>
              <th className="num">Valor</th>
              <th>Criada</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td className="mono">{l.phone || '—'}</td>
                <td>{l.status || '—'}</td>
                <td className="num">{l.value != null ? eur.format(l.value) : '—'}</td>
                <td>{fmtDate(l.created_at)}</td>
                <td>
                  <a className="link" href={`${CRM_ORIGIN}/leads?lead=${l.id}`} target="_blank" rel="noopener">
                    abrir
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Clients({ orgId }: { orgId: string }) {
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const { data, loading, error, reload } = useAsync<ClientRow[]>(() => listClients(orgId, debounced), [orgId, debounced]);

  return (
    <>
      <div className="row" style={{ marginBottom: 12, gap: 10 }}>
        <Search value={q} onChange={setQ} />
        <button className="primary" onClick={() => setCreating(true)} disabled={creating}>
          + Novo cliente
        </button>
      </div>
      {creating && (
        <NewClientForm
          orgId={orgId}
          onCancel={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            void reload();
          }}
        />
      )}
      {error && <p className="err">{error}</p>}
      {loading ? (
        <p className="muted">A carregar…</p>
      ) : !data?.length ? (
        <p className="muted">Sem clientes.</p>
      ) : (
        <table className="grid">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Cliente desde</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="mono">{c.phone || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{fmtDate(c.created_at)}</td>
                <td>
                  <a
                    className="link"
                    href={`${CRM_ORIGIN}/clients?highlight=${c.id}`}
                    target="_blank"
                    rel="noopener"
                  >
                    abrir
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Deals({ orgId, kind }: { orgId: string; kind: 'sales' | 'proposals' }) {
  const { data, loading, error } = useAsync<DealListRow[]>(
    () => (kind === 'sales' ? listSales(orgId) : listProposals(orgId)),
    [orgId, kind],
  );
  const label = kind === 'sales' ? 'Venda' : 'Proposta';
  const param = kind === 'sales' ? 'sale' : 'proposal';

  if (loading) return <p className="muted">A carregar…</p>;
  if (error) return <p className="err">{error}</p>;
  if (!data?.length) return <p className="muted">Sem {kind === 'sales' ? 'vendas' : 'propostas'}.</p>;

  return (
    <table className="grid">
      <thead>
        <tr>
          <th>Código</th>
          <th>Estado</th>
          <th className="num">Valor</th>
          <th>Data</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.id}>
            <td>{d.code || label}</td>
            <td>{d.status || '—'}</td>
            <td className="num">{d.total_value != null ? eur.format(d.total_value) : '—'}</td>
            <td>{fmtDate(d.created_at)}</td>
            <td>
              <a className="link" href={`${CRM_ORIGIN}/${kind}?${param}=${d.id}`} target="_blank" rel="noopener">
                abrir
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
