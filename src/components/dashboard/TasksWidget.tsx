import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, ArrowRight, CalendarClock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOpenInboxTasks, isTaskOverdue } from "@/hooks/useInboxTasks";
import { cn } from "@/lib/utils";

function dueLabel(dueAt: string): string {
  const d = new Date(dueAt);
  const now = new Date();
  const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Hoje ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `Amanhã ${time}`;
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

// Dashboard widget: my open conversation tasks (overdue first). Clicking a task
// deep-links into the conversation. Renders nothing when there are no tasks.
export function TasksWidget() {
  const { user } = useAuth();
  const { data: openTasks = [] } = useOpenInboxTasks();

  const myTasks = useMemo(() => {
    const mine = openTasks.filter(
      (t) => t.assigned_to === user?.id || (!t.assigned_to && t.created_by === user?.id),
    );
    // Overdue first, then nearest due date, then no-date.
    return mine.sort((a, b) => {
      const oa = isTaskOverdue(a) ? 0 : 1;
      const ob = isTaskOverdue(b) ? 0 : 1;
      if (oa !== ob) return oa - ob;
      const da = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const db = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return da - db;
    });
  }, [openTasks, user?.id]);

  const overdue = myTasks.filter(isTaskOverdue).length;
  if (myTasks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Minhas tarefas
            {overdue > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                {overdue} atrasada{overdue > 1 ? "s" : ""}
              </span>
            )}
          </span>
          <Link to="/inbox" className="flex items-center gap-1 text-xs font-normal text-muted-foreground hover:text-foreground">
            Abrir <ArrowRight className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {myTasks.slice(0, 6).map((t) => {
            const late = isTaskOverdue(t);
            return (
              <Link
                key={t.id}
                to={t.contact_phone ? `/inbox?phone=${encodeURIComponent(t.contact_phone)}` : "/inbox"}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate">{t.title}</span>
                  {t.contact_name && (
                    <span className="block truncate text-[11px] text-muted-foreground">{t.contact_name}</span>
                  )}
                </span>
                {t.due_at && (
                  <span className={cn("flex shrink-0 items-center gap-1 text-xs", late ? "font-semibold text-red-600" : "text-muted-foreground")}>
                    <CalendarClock className="h-3 w-3" />
                    {late ? "Atrasada" : dueLabel(t.due_at)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
