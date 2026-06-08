import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Sparkles, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { useChangelog } from "@/hooks/useChangelog";

export default function Novidades() {
  const navigate = useNavigate();
  const { data: entries = [], isLoading } = useChangelog();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20 md:p-6 md:pb-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" /> O que há de novo
          </h1>
          <p className="text-sm text-muted-foreground">Histórico de atualizações da plataforma.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Ainda não há novidades publicadas.
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Link key={e.id} to={`/novidades/${e.id}`} className="block">
              <Card className="group p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {e.version && <Badge variant="secondary" className="shrink-0">{e.version}</Badge>}
                      <h2 className="truncate font-semibold">{e.title}</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(e.published_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                      {" · "}
                      {formatDistanceToNow(parseISO(e.published_at), { addSuffix: true, locale: pt })}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
