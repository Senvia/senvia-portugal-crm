import { useState } from "react";
import { Loader2, StickyNote, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useContactNotes,
  useAddContactNote,
  useDeleteContactNote,
  notePhoneKey,
} from "@/hooks/useContactNotes";

// Unified contact-notes panel: one timeline of dated notes per contact, keyed by
// phone. Drop-in for the inbox contact panel AND the CRM lead/client records, so
// the same notes show everywhere. `source` just records where a note was written.
export function ContactNotes({
  phone,
  source = "crm",
  className,
}: {
  phone: string | null | undefined;
  source?: "inbox" | "crm";
  className?: string;
}) {
  const { data: notes = [], isLoading } = useContactNotes(phone);
  const addNote = useAddContactNote();
  const deleteNote = useDeleteContactNote();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const phoneKey = notePhoneKey(phone);
  const canWrite = phoneKey.length >= 6;

  const submit = () => {
    if (!draft.trim() || !phone) return;
    addNote.mutate(
      { phone, content: draft.trim(), source },
      {
        onSuccess: () => setDraft(""),
        onError: (e) =>
          toast({ title: "Falha ao guardar a nota", description: (e as Error).message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <StickyNote className="h-3.5 w-3.5 text-amber-500" /> Notas
        {notes.length > 0 && (
          <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            {notes.length}
          </span>
        )}
      </p>

      {canWrite && (
        <div className="mb-3 flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreve uma nota… (Ctrl+Enter para guardar)"
            rows={2}
            className="min-h-[60px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            size="sm"
            className="h-8 self-end"
            disabled={!draft.trim() || addNote.isPending}
            onClick={submit}
          >
            {addNote.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
            Adicionar
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">A carregar notas…</p>
      ) : notes.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {canWrite ? "Ainda não há notas. Escreve a primeira acima." : "Sem número de telefone — não é possível guardar notas."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {notes.map((n) => (
            <div
              key={n.id}
              className="group rounded-lg border border-amber-300/50 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100"
            >
              <p className="whitespace-pre-wrap break-words">{n.content}</p>
              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-amber-600/80 dark:text-amber-400/70">
                <span className="truncate">
                  {n.author_name || (n.source === "import" ? "Importada" : "Equipa")} ·{" "}
                  {new Date(n.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "2-digit" })}{" "}
                  {new Date(n.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  type="button"
                  title="Apagar nota"
                  disabled={deleteNote.isPending}
                  onClick={() => {
                    if (!window.confirm("Apagar esta nota?")) return;
                    deleteNote.mutate(
                      { id: n.id, phoneKey },
                      { onError: (e) => toast({ title: "Falha ao apagar", description: (e as Error).message, variant: "destructive" }) },
                    );
                  }}
                  className="shrink-0 rounded p-0.5 text-amber-600/70 opacity-70 transition-opacity hover:bg-red-500/10 hover:text-red-600 hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
