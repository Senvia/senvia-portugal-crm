import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  useConversationTasks, useCreateInboxTask, useToggleInboxTask, useUpdateInboxTask,
  useDeleteInboxTask, isTaskOverdue, type InboxTask,
} from "@/hooks/useInboxTasks";
import { cn } from "@/lib/utils";
import {
  CalendarClock, Check, ChevronDown, ChevronRight, ClipboardList, Loader2, MoreVertical, Plus, Trash2,
} from "lucide-react";

interface TeamMemberLite {
  user_id: string;
  full_name: string | null;
}

interface ConversationTasksProps {
  phone: string;
  contactName: string;
  conversationId: number;
  leadId?: string | null;
  clientId?: string | null;
  teamMembers: TeamMemberLite[];
  /** Pre-fill the quick-add (e.g. "transformar mensagem em tarefa"). */
  prefill?: string | null;
  onPrefillConsumed?: () => void;
}

// ---- due-date helpers ----

function presetToDate(preset: string, custom: string): Date | null {
  const d = new Date();
  switch (preset) {
    case "1h":
      d.setHours(d.getHours() + 1, 0, 0, 0);
      return d;
    case "today": {
      d.setHours(18, 0, 0, 0);
      if (d.getTime() < Date.now()) d.setHours(new Date().getHours() + 1, 0, 0, 0);
      return d;
    }
    case "tomorrow":
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    case "monday": {
      const day = d.getDay();
      const add = ((8 - day) % 7) || 7;
      d.setDate(d.getDate() + add);
      d.setHours(9, 0, 0, 0);
      return d;
    }
    case "custom":
      return custom ? new Date(custom) : null;
    default:
      return null;
  }
}

function formatDue(dueAt: string): { label: string; tone: "overdue" | "today" | "later" } {
  const d = new Date(dueAt);
  const now = new Date();
  const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  if (d.getTime() < now.getTime()) {
    const sameDay = d.toDateString() === now.toDateString();
    return { label: sameDay ? `Venceu às ${time}` : `Venceu ${d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}`, tone: "overdue" };
  }
  if (d.toDateString() === now.toDateString()) return { label: `Hoje ${time}`, tone: "today" };
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return { label: `Amanhã ${time}`, tone: "later" };
  return { label: d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }), tone: "later" };
}

function firstName(name: string | null | undefined): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

// ---- component ----

export function ConversationTasks({
  phone, contactName, conversationId, leadId, clientId, teamMembers, prefill, onPrefillConsumed,
}: ConversationTasksProps) {
  const { user } = useAuth();
  const { data: tasks = [] } = useConversationTasks(phone);
  const createTask = useCreateInboxTask();
  const toggleTask = useToggleInboxTask();
  const updateTask = useUpdateInboxTask();
  const deleteTask = useDeleteInboxTask();

  const [title, setTitle] = useState("");
  const [duePreset, setDuePreset] = useState("today");
  const [customDue, setCustomDue] = useState("");
  const [assignee, setAssignee] = useState("me");
  const [showDone, setShowDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // "Transformar mensagem em tarefa" lands here pre-filled.
  useEffect(() => {
    if (prefill != null && prefill !== "") {
      setTitle(prefill.slice(0, 160));
      inputRef.current?.focus();
      onPrefillConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const open = tasks.filter((t) => !t.done_at);
  const done = tasks.filter((t) => !!t.done_at);

  const handleAdd = () => {
    const text = title.trim();
    if (!text || createTask.isPending) return;
    createTask.mutate(
      {
        title: text,
        dueAt: presetToDate(duePreset, customDue),
        assignedTo: assignee === "me" ? user?.id ?? null : assignee === "none" ? null : assignee,
        conversationId,
        contactPhone: phone,
        contactName,
        leadId: leadId ?? null,
        clientId: clientId ?? null,
      },
      { onSuccess: () => setTitle("") },
    );
  };

  const snooze = (t: InboxTask, kind: "1h" | "1d" | "1w" | "clear") => {
    if (kind === "clear") return updateTask.mutate({ id: t.id, dueAt: null });
    const base = t.due_at && new Date(t.due_at).getTime() > Date.now() ? new Date(t.due_at) : new Date();
    if (kind === "1h") base.setHours(base.getHours() + 1);
    if (kind === "1d") { base.setDate(base.getDate() + 1); base.setHours(9, 0, 0, 0); }
    if (kind === "1w") { base.setDate(base.getDate() + 7); base.setHours(9, 0, 0, 0); }
    updateTask.mutate({ id: t.id, dueAt: base });
  };

  const memberName = (id: string | null) => {
    if (!id) return null;
    if (id === user?.id) return "Eu";
    return firstName(teamMembers.find((m) => m.user_id === id)?.full_name) || null;
  };

  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" />
        Tarefas{open.length > 0 ? ` (${open.length})` : ""}
      </p>

      {/* Open tasks */}
      <div className="space-y-1">
        {open.map((t) => {
          const due = t.due_at ? formatDue(t.due_at) : null;
          const assigned = memberName(t.assigned_to);
          return (
            <div key={t.id} className="group flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-accent/50">
              <button
                type="button"
                title="Concluir"
                onClick={() => toggleTask.mutate({ id: t.id, done: true })}
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-muted-foreground/40 text-transparent transition-colors hover:border-emerald-500 hover:text-emerald-500"
              >
                <Check className="h-3 w-3" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="break-words text-xs leading-snug">{t.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {due && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        due.tone === "overdue" && "bg-red-100 text-red-700",
                        due.tone === "today" && "bg-amber-100 text-amber-700",
                        due.tone === "later" && "bg-muted text-muted-foreground",
                      )}
                    >
                      <CalendarClock className="h-2.5 w-2.5" />
                      {due.label}
                    </span>
                  )}
                  {assigned && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{assigned}</span>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => snooze(t, "1h")}>Adiar 1 hora</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => snooze(t, "1d")}>Adiar para amanhã (9h)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => snooze(t, "1w")}>Adiar 1 semana</DropdownMenuItem>
                  {t.due_at && <DropdownMenuItem onClick={() => snooze(t, "clear")}>Remover prazo</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  {teamMembers.map((m) => (
                    <DropdownMenuItem key={m.user_id} onClick={() => updateTask.mutate({ id: t.id, assignedTo: m.user_id })}>
                      Atribuir a {firstName(m.full_name) || "membro"}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteTask.mutate(t.id)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Apagar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
        {open.length === 0 && (
          <p className="px-1 text-[11px] text-muted-foreground">Sem tarefas — adiciona uma para não esqueceres o combinado.</p>
        )}
      </div>

      {/* Quick add */}
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            placeholder="Adicionar tarefa..."
            className="h-8 text-xs"
          />
          <Button size="icon" className="h-8 w-8 shrink-0" disabled={!title.trim() || createTask.isPending} onClick={handleAdd}>
            {createTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={duePreset} onValueChange={setDuePreset}>
            <SelectTrigger className="h-7 flex-1 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Daqui a 1 hora</SelectItem>
              <SelectItem value="today">Hoje (18h)</SelectItem>
              <SelectItem value="tomorrow">Amanhã (9h)</SelectItem>
              <SelectItem value="monday">Segunda (9h)</SelectItem>
              <SelectItem value="custom">Data à escolha…</SelectItem>
              <SelectItem value="none">Sem prazo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger className="h-7 flex-1 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Para mim</SelectItem>
              {teamMembers.filter((m) => m.user_id !== user?.id).map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>{firstName(m.full_name) || "Membro"}</SelectItem>
              ))}
              <SelectItem value="none">Sem responsável</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {duePreset === "custom" && (
          <Input
            type="datetime-local"
            value={customDue}
            onChange={(e) => setCustomDue(e.target.value)}
            className="h-8 text-xs"
          />
        )}
      </div>

      {/* Done (collapsed) */}
      {done.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {showDone ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Concluídas ({done.length})
          </button>
          {showDone && (
            <div className="mt-1 space-y-0.5">
              {done.map((t) => (
                <div key={t.id} className="group flex items-center gap-2 rounded px-1 py-0.5">
                  <button
                    type="button"
                    title="Reabrir"
                    onClick={() => toggleTask.mutate({ id: t.id, done: false })}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-500 bg-emerald-500 text-white"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground line-through">{t.title}</p>
                  <button
                    type="button"
                    onClick={() => deleteTask.mutate(t.id)}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export for reuse in the "Minhas tarefas" views (popover + dashboard widget).
export { formatDue, firstName as taskFirstName };
export { isTaskOverdue };
