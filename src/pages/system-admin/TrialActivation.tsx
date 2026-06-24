import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Activity, AlertTriangle, TrendingUp, Target, ShieldCheck,
} from "lucide-react";

// Mirrors public.trial_activation_overview (security_invoker view).
interface TrialRow {
  organization_id: string;
  name: string;
  created_at: string | null;
  trial_ends_at: string | null;
  plan: string | null;
  first_paid_at: string | null;
  current_period_end: string | null;
  last_active_at: string | null;
  first_lead_at: string | null;
  first_client_at: string | null;
  first_sale_at: string | null;
  first_proposal_at: string | null;
  trial_days_left: number | null;
  hours_since_active: number | null;
  is_paying: boolean;
  activated_min: boolean;
  activated_med: boolean;
  activated_adv: boolean;
  activation_level: "none" | "minimum" | "medium" | "advanced";
  trial_status: "active" | "expired" | "paying";
}

const LEVEL_META: Record<TrialRow["activation_level"], { label: string; className: string }> = {
  none: { label: "Sem atividade", className: "bg-muted text-muted-foreground" },
  minimum: { label: "Mínimo", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  medium: { label: "Médio (venda)", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  advanced: { label: "Avançado", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

function fmtLastActive(hours: number | null): string {
  if (hours === null) return "nunca";
  if (hours < 1) return "agora mesmo";
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

const STUCK_HOURS = 48;

export default function SystemAdminTrialActivation() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["trial-activation-overview"],
    queryFn: async (): Promise<TrialRow[]> => {
      // View not in generated types yet — cast through any.
      const { data, error } = await (supabase as any)
        .from("trial_activation_overview")
        .select("*")
        .order("trial_ends_at", { ascending: true });
      if (error) throw error;
      return (data || []) as TrialRow[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const metrics = useMemo(() => {
    const active = rows.filter((r) => r.trial_status === "active");
    const expired = rows.filter((r) => r.trial_status === "expired");
    const paying = rows.filter((r) => r.is_paying);

    const reachedAha = active.filter((r) => r.activated_med).length;
    const stuck = active.filter(
      (r) => r.hours_since_active === null || r.hours_since_active >= STUCK_HOURS,
    ).length;

    // Honest conversion: of trials that already ended their journey (expired or
    // paying), how many pay? Active trials are still undecided, so excluded.
    const decided = expired.length + paying.length;
    const conversionRate = decided > 0 ? Math.round((paying.length / decided) * 100) : null;

    const funnel = {
      none: active.filter((r) => r.activation_level === "none").length,
      minimum: active.filter((r) => r.activation_level === "minimum").length,
      medium: active.filter((r) => r.activation_level === "medium").length,
      advanced: active.filter((r) => r.activation_level === "advanced").length,
    };

    return {
      activeCount: active.length,
      reachedAha,
      stuck,
      payingCount: paying.length,
      conversionRate,
      funnel,
    };
  }, [rows]);

  const activeRows = useMemo(
    () =>
      rows
        .filter((r) => r.trial_status === "active")
        .sort((a, b) => (a.trial_days_left ?? 999) - (b.trial_days_left ?? 999)),
    [rows],
  );

  return (
    <div className="min-h-dvh bg-background p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            Ativação de Trials
          </h1>
          <p className="text-sm text-muted-foreground">
            Onde está cada trial no funil de ativação. O "aha" é a primeira venda registada.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={<Activity className="h-4 w-4 text-primary" />}
                label="Trials ativos"
                value={metrics.activeCount}
              />
              <MetricCard
                icon={<Target className="h-4 w-4 text-blue-600" />}
                label="Chegaram ao aha (venda)"
                value={metrics.reachedAha}
                hint={metrics.activeCount > 0 ? `${Math.round((metrics.reachedAha / metrics.activeCount) * 100)}% dos ativos` : undefined}
              />
              <MetricCard
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                label={`Parados +${STUCK_HOURS}h`}
                value={metrics.stuck}
                hint={metrics.stuck > 0 ? "precisam de toque" : "tudo a mexer"}
              />
              <MetricCard
                icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                label="Conversão"
                value={metrics.conversionRate === null ? "—" : `${metrics.conversionRate}%`}
                hint={`${metrics.payingCount} a pagar`}
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Funil de ativação (trials ativos)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-sm">
                  <FunnelChip label="Sem atividade" value={metrics.funnel.none} className={LEVEL_META.none.className} />
                  <FunnelChip label="Mínimo" value={metrics.funnel.minimum} className={LEVEL_META.minimum.className} />
                  <FunnelChip label="Médio (venda)" value={metrics.funnel.medium} className={LEVEL_META.medium.className} />
                  <FunnelChip label="Avançado" value={metrics.funnel.advanced} className={LEVEL_META.advanced.className} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Trials ativos ({activeRows.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organização</TableHead>
                        <TableHead className="text-center">Dias restantes</TableHead>
                        <TableHead className="text-center">Nível</TableHead>
                        <TableHead className="text-center">Sinais</TableHead>
                        <TableHead className="text-right">Última atividade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                            Nenhum trial ativo de momento.
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeRows.map((r) => {
                          const stuck = r.hours_since_active === null || r.hours_since_active >= STUCK_HOURS;
                          const meta = LEVEL_META[r.activation_level];
                          return (
                            <TableRow key={r.organization_id} className={stuck ? "bg-amber-50/50 dark:bg-amber-950/20" : undefined}>
                              <TableCell className="font-medium">{r.name}</TableCell>
                              <TableCell className="text-center">
                                <span className={(r.trial_days_left ?? 0) <= 3 ? "text-destructive font-semibold" : ""}>
                                  {r.trial_days_left ?? "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className={meta.className}>{meta.label}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <SignalDot on={!!r.first_lead_at} title="Leads" letter="L" />
                                  <SignalDot on={!!r.first_client_at} title="Clientes" letter="C" />
                                  <SignalDot on={!!r.first_sale_at} title="Vendas" letter="V" />
                                  <SignalDot on={!!r.first_proposal_at} title="Propostas" letter="P" />
                                </div>
                              </TableCell>
                              <TableCell className={`text-right ${stuck ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
                                {fmtLastActive(r.hours_since_active)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/system-admin">← Voltar ao Painel Super Admin</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function FunnelChip({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${className}`}>
      {label}
      <span className="rounded-full bg-background/60 px-1.5 text-xs">{value}</span>
    </span>
  );
}

function SignalDot({ on, title, letter }: { on: boolean; title: string; letter: string }) {
  return (
    <span
      title={title}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
        on ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground/50"
      }`}
    >
      {letter}
    </span>
  );
}
