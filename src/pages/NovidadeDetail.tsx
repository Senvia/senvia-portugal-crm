import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { useChangelogEntry } from "@/hooks/useChangelog";

export default function NovidadeDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: entry, isLoading } = useChangelogEntry(id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20 md:p-6 md:pb-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/novidades")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">O que há de novo</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !entry ? (
        <Card className="p-10 text-center text-muted-foreground">
          Atualização não encontrada.
        </Card>
      ) : (
        <article className="space-y-4">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {entry.version && <Badge variant="secondary">{entry.version}</Badge>}
              <span className="text-sm text-muted-foreground">
                {format(parseISO(entry.published_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{entry.title}</h2>
          </header>

          {entry.image_url && (
            <img
              src={entry.image_url}
              alt={entry.title}
              className="max-h-64 w-full rounded-lg object-cover"
            />
          )}

          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </div>
        </article>
      )}
    </div>
  );
}
