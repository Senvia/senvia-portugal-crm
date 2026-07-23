import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Euro, CreditCard, Sparkles, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { OrgStripeData } from "@/components/system-admin/OrganizationsTable";
import { classifyOrg, BUCKET_META, type OrgBucket } from "@/components/system-admin/orgStatus";

// Light-theme token values (recharts SVG attrs don't resolve CSS var()).
const INK = "hsl(220 9% 46%)";
const GRID = "hsl(220 13% 91%)";
const PRIMARY = "hsl(217 91% 60%)";

const ORDER: OrgBucket[] = ["paying", "trial", "overdue", "blocked", "expired", "canceled", "exempt"];

export interface OverviewOrg {
  id: string;
  plan: string | null;
  trial_ends_at: string | null;
  billing_exempt: boolean | null;
  created_at: string | null;
  first_paid_at: string | null;
  current_period_end: string | null;
  payment_failed_at: string | null;
}

interface AdminOverviewProps {
  organizations: OverviewOrg[];
  stripeStats?: { mrr: number; paying_count: number; total_subscriptions: number; org_stats: OrgStripeData[] } | null;
  loading?: boolean;
}

function capMonth(d: Date): string {
  const s = d.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function AdminOverview({ organizations, stripeStats, loading }: AdminOverviewProps) {
  const now = new Date();

  const stripeMap = useMemo(() => {
    const m = new Map<string, OrgStripeData>();
    (stripeStats?.org_stats || []).forEach((s) => m.set(s.org_id, s));
    return m;
  }, [stripeStats]);

  const { buckets, trialExpiringSoon, monthly } = useMemo(() => {
    const counts: Record<OrgBucket, number> = { paying: 0, trial: 0, overdue: 0, blocked: 0, expired: 0, canceled: 0, exempt: 0 };
    let trialExpiringSoon = 0;

    for (const o of organizations) {
      const b = classifyOrg(o, stripeMap.get(o.id)?.stripe_status, now);
      counts[b]++;
      if (b === "trial" && o.trial_ends_at) {
        const days = (new Date(o.trial_ends_at).getTime() - now.getTime()) / 86400000;
        if (days <= 3) trialExpiringSoon++;
      }
    }

    // New orgs per month, last 6 months.
    const monthly: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const value = organizations.filter((o) => {
        if (!o.created_at) return false;
        const c = new Date(o.created_at);
        return c.getFullYear() === y && c.getMonth() === m;
      }).length;
      monthly.push({ label: capMonth(d), value });
    }

    return { buckets: counts, trialExpiringSoon, monthly };
  }, [organizations, stripeMap, now]);

  const mrr = stripeStats?.mrr ?? 0;
  const arr = mrr * 12;
  const activeTotal = buckets.paying + buckets.trial + buckets.overdue + buckets.blocked;
  const payingPct = activeTotal > 0 ? Math.round((buckets.paying / activeTotal) * 100) : 0;
  const barTotal = buckets.paying + buckets.trial + buckets.overdue + buckets.blocked + buckets.expired + buckets.canceled;

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="MRR"
          value={`€${mrr.toLocaleString("pt-PT")}`}
          subtitle={`≈ €${arr.toLocaleString("pt-PT")} ARR`}
          icon={<Euro className="h-4 w-4" />}
          loading={loading}
        />
        <MetricCard
          label="Clientes a pagar"
          value={buckets.paying}
          subtitle={activeTotal > 0 ? `${payingPct}% das contas ativas` : "sem contas ativas"}
          icon={<CreditCard className="h-4 w-4" />}
          tone="success"
          loading={loading}
        />
        <MetricCard
          label="Em trial"
          value={buckets.trial}
          subtitle={trialExpiringSoon > 0 ? `${trialExpiringSoon} expiram em ≤3 dias` : "a converter"}
          icon={<Sparkles className="h-4 w-4" />}
          loading={loading}
        />
        <MetricCard
          label="Trials expirados"
          value={buckets.expired}
          subtitle="nunca converteram"
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={buckets.expired > 0 ? "danger" : "default"}
          loading={loading}
        />
      </div>

      {/* Chart + subscription status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Novas empresas por mês</CardTitle>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: INK }} />
                  <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: INK }} />
                  <Tooltip
                    cursor={{ fill: "hsl(220 14% 96%)" }}
                    contentStyle={{ borderRadius: 10, border: `1px solid ${GRID}`, fontSize: 12, boxShadow: "0 4px 12px hsl(222 47% 11% / 0.08)" }}
                    labelStyle={{ color: "hsl(222 47% 11%)", fontWeight: 600 }}
                    formatter={(v: number) => [`${v}`, "Novas"]}
                  />
                  <Bar dataKey="value" fill={PRIMARY} radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estado das assinaturas</CardTitle>
            <p className="text-xs text-muted-foreground">Distribuição atual</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-2.5 w-full rounded-full" />
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                </div>
              </div>
            ) : (
              <>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {barTotal > 0 &&
                    ORDER.filter((k) => k !== "exempt").map((k) =>
                      buckets[k] > 0 ? (
                        <div
                          key={k}
                          className={BUCKET_META[k].dot}
                          style={{ width: `${(buckets[k] / barTotal) * 100}%` }}
                          title={`${BUCKET_META[k].label}: ${buckets[k]}`}
                        />
                      ) : null,
                    )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {ORDER.map((k) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", BUCKET_META[k].dot)} />
                      <span className="flex-1 text-muted-foreground">{BUCKET_META[k].label}</span>
                      <span className="font-medium tabular-nums text-foreground">{buckets[k]}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, subtitle, icon, tone = "default", loading,
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "danger";
  loading?: boolean;
}) {
  const toneClass = tone === "success" ? "text-emerald-600 dark:text-emerald-400" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-24" />
      ) : (
        <div className={cn("mt-2 text-3xl font-semibold tracking-tight tabular-nums", toneClass)}>{value}</div>
      )}
      {subtitle && !loading && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  );
}
