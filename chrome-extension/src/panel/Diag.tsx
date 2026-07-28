import type { DetectDiag } from '../lib/protocol';

/**
 * Collapsible dump of what the content script actually saw in the page.
 *
 * WhatsApp Web's markup is obfuscated and shifts between releases, so when
 * detection fails the only thing that matters is what was really there. Putting
 * it in the panel means a screenshot is enough to diagnose it — nobody has to
 * be walked through opening a devtools console.
 */
export function Diag({ diag }: { diag: DetectDiag | null }) {
  if (!diag) return null;
  return (
    <details style={{ marginTop: 12, textAlign: 'left' }}>
      <summary className="small muted" style={{ cursor: 'pointer' }}>
        Detalhes técnicos
      </summary>
      <div className="card small" style={{ marginTop: 8, wordBreak: 'break-all' }}>
        <div>#main encontrado: {String(diag.mainFound)}</div>
        <div>título lido: {diag.title ? `"${diag.title}"` : '(nenhum)'}</div>
        <div>elementos data-id: {diag.dataIdCount}</div>
        <div>número via: {diag.resolvedVia ?? '(não resolvido)'}</div>
        {diag.sample.length > 0 && (
          <div style={{ marginTop: 4 }}>
            amostra data-id:
            {diag.sample.map((s, i) => (
              <div key={i} className="muted">
                {s}
              </div>
            ))}
          </div>
        )}
        {diag.db && (
          <div style={{ marginTop: 6 }}>
            <div>bases IndexedDB: {diag.db.databases.join(', ') || '(nenhuma)'}</div>
            <div>tabelas lidas: {diag.db.scannedStores.join(', ') || '(nenhuma)'}</div>
            <div>registos percorridos: {diag.db.recordsScanned}</div>
            {diag.db.error && <div style={{ color: 'var(--danger)' }}>erro: {diag.db.error}</div>}
          </div>
        )}
      </div>
    </details>
  );
}
