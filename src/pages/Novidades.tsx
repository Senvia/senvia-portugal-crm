import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Sparkles } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useChangelog } from "@/hooks/useChangelog";

export default function Novidades() {
  const navigate = useNavigate();
  const { data: entries = [], isLoading } = useChangelog();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pre-select the latest entry once data arrives.
  useEffect(() => {
    if (!selectedId && entries.length > 0) setSelectedId(entries[0].id);
  }, [entries, selectedId]);

  const selected = entries.find((e) => e.id === selectedId) || entries[0] || null;

  return (
    <div className="space-y-6 p-4 pb-20 md:p-6 md:pb-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" /> O que há de novo
          </h1>
          <p className="text-sm text-muted-foreground">Histórico de atualizações da plataforma.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Ainda não há novidades publicadas.
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
          {/* Left: version list */}
          <div className="space-y-2">
            {entries.map((e) => {
              const active = selected?.id === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    active ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {e.version && <Badge variant="secondary" className="shrink-0">{e.version}</Badge>}
                    <span className="truncate text-sm font-medium">{e.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(parseISO(e.published_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right: selected entry content */}
          <Card className="p-6">
            {selected && (
              <article className="space-y-4">
                <header className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.version && <Badge variant="secondary">{selected.version}</Badge>}
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(selected.published_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                      {" · "}
                      {formatDistanceToNow(parseISO(selected.published_at), { addSuffix: true, locale: pt })}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">{selected.title}</h2>
                </header>

                {selected.image_url && (
                  <img
                    src={selected.image_url}
                    alt={selected.title}
                    className="max-h-64 w-full rounded-lg object-cover"
                  />
                )}

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{selected.content}</ReactMarkdown>
                </div>
              </article>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
