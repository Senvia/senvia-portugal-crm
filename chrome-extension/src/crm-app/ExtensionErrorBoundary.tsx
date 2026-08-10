import { Component, type ReactNode } from 'react';
import { isChunkError, reloadOnce } from '@/components/ErrorBoundary';

/**
 * Same behaviour as the CRM's ErrorBoundary, but it SHOWS the error.
 *
 * The website can afford a friendly "Ocorreu um erro" because the developer can
 * open the console. Here the app runs in an iframe inside WhatsApp Web, whose
 * console is separate and easy to miss — so a generic message leaves nothing to
 * work with, and the real cause is only in a place nobody thinks to look.
 *
 * Chunk errors keep the reload-once behaviour: those are transient by nature.
 */
interface State {
  phase: 'ok' | 'reloading' | 'error';
  message: string;
  stack: string;
}

export class ExtensionErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { phase: 'ok', message: '', stack: '' };

  static getDerivedStateFromError(error: unknown): State {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      phase: isChunkError(error) ? 'reloading' : 'error',
      message: `${err.name}: ${err.message}`,
      stack: err.stack ?? '',
    };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    console.error('[senvia-crm-app]', error, info?.componentStack);
    if (isChunkError(error) && !reloadOnce()) {
      this.setState((s) => ({ ...s, phase: 'error' }));
    }
    // The component stack names the failing component, which the raw stack
    // usually doesn't after minification.
    if (info?.componentStack) {
      this.setState((s) => ({ ...s, stack: `${s.stack}\n\nComponentes:${info.componentStack}` }));
    }
  }

  render() {
    if (this.state.phase === 'reloading') {
      return <div style={{ padding: 24, font: '13px system-ui', color: '#667781' }}>A atualizar…</div>;
    }

    if (this.state.phase === 'error') {
      return (
        <div style={{ padding: 20, font: '13px/1.5 system-ui', color: '#111b21', height: '100vh', overflow: 'auto' }}>
          <h1 style={{ fontSize: 16, margin: '0 0 4px' }}>O Senvia OS não conseguiu abrir aqui</h1>
          <p style={{ margin: '0 0 12px', color: '#667781' }}>
            Copia a mensagem abaixo — é ela que identifica a causa.
          </p>
          <pre
            style={{
              background: '#7f1d1d',
              color: '#fff',
              padding: 12,
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              font: '12px/1.5 ui-monospace, Menlo, Consolas, monospace',
              margin: 0,
            }}
          >
            {this.state.message}
            {this.state.stack ? `\n\n${this.state.stack.slice(0, 2000)}` : ''}
          </pre>
          <button
            onClick={() => {
              try {
                sessionStorage.removeItem('app:lastChunkReload');
              } catch {
                /* noop */
              }
              window.location.reload();
            }}
            style={{
              marginTop: 12,
              padding: '8px 14px',
              borderRadius: 8,
              border: 0,
              background: 'hsl(217 91% 60%)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
