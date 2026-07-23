import { useState, useEffect, memo } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const cache = new Map<string, PreviewData | null>();

function extractUrls(text: string): string[] {
  const re = /(https?:\/\/[^\s<]+)/gi;
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    urls.push(m[0]);
  }
  return urls;
}

async function fetchPreview(url: string): Promise<PreviewData | null> {
  if (cache.has(url)) return cache.get(url)!;
  cache.set(url, null);
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const getMeta = (prop: string) =>
      doc.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ||
      doc.querySelector(`meta[name="${prop}"]`)?.getAttribute('content') ||
      undefined;
    const data: PreviewData = {
      url,
      title: getMeta('og:title') || doc.querySelector('title')?.textContent || undefined,
      description: getMeta('og:description') || getMeta('description') || undefined,
      image: getMeta('og:image') || undefined,
      siteName: getMeta('og:site_name') || undefined,
    };
    const hasData = data.title || data.image || data.description;
    cache.set(url, hasData ? data : null);
    return hasData ? data : null;
  } catch {
    return null;
  }
}

export const LinkPreview = memo(function LinkPreview({
  text,
  outgoing,
}: {
  text: string;
  outgoing: boolean;
}) {
  const urls = extractUrls(text);
  const [previews, setPreviews] = useState<PreviewData[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const results: PreviewData[] = [];
      for (const u of urls.slice(0, 1)) {
        const p = await fetchPreview(u);
        if (p && !cancelled) results.push(p);
      }
      if (!cancelled) setPreviews(results);
    };
    if (urls.length > 0) load();
    return () => { cancelled = true; };
  }, [urls.join(',')]);

  if (previews.length === 0) return null;
  const p = previews[0];
  const domain = (() => { try { return new URL(p.url).hostname.replace('www.', ''); } catch { return p.siteName || ''; } })();

  return (
    <a
      href={p.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'mt-1.5 flex max-w-[280px] overflow-hidden rounded-lg border transition-colors',
        outgoing ? 'border-primary-foreground/20 bg-primary-foreground/5 hover:bg-primary-foreground/10' : 'border-border bg-muted/30 hover:bg-muted/50',
      )}
    >
      {p.image ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-muted">
          <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      ) : (
        <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center', outgoing ? 'bg-primary-foreground/10' : 'bg-muted')}>
          <ImageIcon className="h-5 w-5 opacity-40" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2.5 py-1.5">
        <p className={cn('line-clamp-2 text-xs font-medium leading-tight', outgoing ? 'text-primary-foreground' : 'text-foreground')}>
          {p.title || domain}
        </p>
        {p.description && (
          <p className={cn('line-clamp-1 text-[10px] leading-tight', outgoing ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
            {p.description}
          </p>
        )}
        <p className={cn('flex items-center gap-1 text-[10px]', outgoing ? 'text-primary-foreground/50' : 'text-muted-foreground/70')}>
          <ExternalLink className="h-2.5 w-2.5" />
          {domain}
        </p>
      </div>
    </a>
  );
});
