import { useState, useRef, useCallback } from 'react';
import { Download, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDownloadAttachment } from '@/hooks/useChatwootInbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type State = 'idle' | 'downloading' | 'done' | 'error';

export function ProgressDownloadButton({
  url,
  extension,
  filename,
  className,
  outgoing = false,
}: {
  url: string;
  extension?: string | null;
  filename?: string;
  className?: string;
  outgoing?: boolean;
}) {
  const fallbackDownload = useDownloadAttachment();
  const { organization } = useAuth();
  const [state, setState] = useState<State>('idle');
  const [pct, setPct] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const name = filename || (extension ? `anexo.${extension}` : 'anexo');

  const start = useCallback(async () => {
    if (state === 'downloading') {
      abortRef.current?.abort();
      return;
    }
    setState('downloading');
    setPct(0);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatwoot-inbox`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            organization_id: organization?.id,
            action: 'download_attachment',
            url,
          }),
          signal: controller.signal,
        },
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const total = Number(res.headers.get('content-length') || 0);
      const reader = res.body?.getReader();

      if (!reader || !total) {
        const blob = await res.blob();
        triggerDownload(blob, name);
        setState('done');
        setTimeout(() => setState('idle'), 2000);
        return;
      }

      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          setPct(Math.min(100, Math.round((received / total) * 100)));
        }
      }
      const blob = new Blob(chunks as BlobPart[]);
      triggerDownload(blob, name);
      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setState('idle');
        setPct(0);
        return;
      }
      try {
        await fallbackDownload(url, extension);
        setState('done');
        setTimeout(() => setState('idle'), 2000);
      } catch {
        setState('error');
        setTimeout(() => setState('idle'), 2000);
      }
    }
  }, [state, url, extension, name, organization?.id, fallbackDownload]);

  return (
    <button
      type="button"
      title={state === 'downloading' ? `${pct}% — clique para cancelar` : 'Transferir'}
      onClick={start}
      className={cn(
        'shrink-0 relative overflow-hidden rounded-md p-1.5 transition-all',
        outgoing ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {state === 'downloading' && pct > 0 && (
        <span
          className={cn(
            'absolute inset-0',
            outgoing ? 'bg-primary-foreground/20' : 'bg-primary/15',
          )}
          style={{ width: `${pct}%`, transition: 'width 0.15s ease-out' }}
        />
      )}
      <span className="relative flex items-center justify-center">
        {state === 'downloading' ? (
          pct > 0 ? (
            <span className="text-[10px] font-medium tabular-nums">{pct}%</span>
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )
        ) : state === 'done' ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : state === 'error' ? (
          <X className="h-4 w-4 text-red-500" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
