import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MiniBarChart } from "@/components/dashboard/MiniBarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

type MetricView = "global" | "team";

type TeamMetric = {
  name: string;
  objetivo: number;
  ativos: number;
  pendentes: number;
};

const teamBreakdown: TeamMetric[] = [
  { name: "André Coelho", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Carla Caralinda", objetivo: 0, ativos: 67.49, pendentes: 637.48 },
  { name: "Carla Pereira", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Fernando Gama", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Jorge Henriques", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Marco Fernandes", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Nuno Miguel Campos Silva", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Parceiros", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Pedro Manuel Bento Martins", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Ricardo Cabral", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Sara Dias", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Sonia Dias", objetivo: 0, ativos: 0, pendentes: 0 },
  { name: "Susana Carapito", objetivo: 0, ativos: 676.95, pendentes: 766.26 },
  { name: "Vanda Barata", objetivo: 0, ativos: 0, pendentes: 0 },
];

const portalHomeMetrics = [
  {
    title: "Angariados",
    color: "hsl(var(--primary))",
    summary: {
      objetivo: 90,
      ativos: 74,
      pendentes: 16,
    },
  },
  {
    title: "Adicionados",
    color: "hsl(var(--secondary-foreground))",
    summary: {
      objetivo: 44,
      ativos: 39,
      pendentes: 5,
    },
  },
  {
    title: "Fidelizados",
    color: "hsl(var(--accent-foreground))",
    summary: {
      objetivo: 28,
      ativos: 24,
      pendentes: 4,
    },
  },
  {
    title: "Residêncial",
    color: "hsl(var(--muted-foreground))",
    summary: {
      objetivo: 48,
      ativos: 41,
      pendentes: 7,
    },
  },
  {
    title: "Novos NIFs",
    color: "hsl(var(--foreground))",
    summary: {
      objetivo: 26,
      ativos: 21,
      pendentes: 5,
    },
  },
];

const summaryItems = [
  { key: "objetivo", label: "Objetivo" },
  { key: "ativos", label: "Ativos" },
  { key: "pendentes", label: "Pendentes" },
] as const;

export default function PortalTotalLinkHomePage() {
  const [searchParams] = useSearchParams();
  const [metricViews, setMetricViews] = useState<Record<string, MetricView>>(() =>
    Object.fromEntries(portalHomeMetrics.map((metric) => [metric.title, "global"])) as Record<string, MetricView>
  );

  const selectedCycle = searchParams.get("homeCycle") ?? "1";
  const selectedYear = searchParams.get("homeYear") ?? String(new Date().getFullYear());

  const globalLabel = useMemo(
    () => `Ciclo ${selectedCycle} / ${selectedYear} - Global`,
    [selectedCycle, selectedYear]
  );

  const teamLabel = useMemo(
    () => `Ciclo ${selectedCycle} / ${selectedYear} - Equipa`,
    [selectedCycle, selectedYear]
  );

  const handleOpenTeamView = (metricTitle: string) => {
    setMetricViews((current) => ({ ...current, [metricTitle]: "team" }));
  };

  const handleReturnToGlobal = (metricTitle: string) => {
    setMetricViews((current) => ({ ...current, [metricTitle]: "global" }));
  };

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {portalHomeMetrics.map((metric) => {
          const currentView = metricViews[metric.title] ?? "global";
          const isTeamView = currentView === "team";
          const chartData = summaryItems.map((item) => ({
            name: item.label,
            value: metric.summary[item.key],
          }));

          return (
            <Card key={metric.title} className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-sm">
              <CardHeader className="space-y-3 p-5 pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Portal Total Link</p>
                    <CardTitle className="text-xl font-semibold text-foreground">{metric.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{isTeamView ? teamLabel : globalLabel}</p>
                  </div>

                  <span className="inline-flex rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {isTeamView ? "Equipa" : "Global"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 p-5">
                {isTeamView ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Vista detalhada por equipa
                      </p>
                      <button
                        type="button"
                        onClick={() => handleReturnToGlobal(metric.title)}
                        className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Voltar ao Global
                      </button>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/20 px-2 py-4">
                      <MiniBarChart data={teamBreakdown} height={248} mode="grouped" />
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Equipa</TableHead>
                            <TableHead className="text-right">Objetivo</TableHead>
                            <TableHead className="text-right">Ativos</TableHead>
                            <TableHead className="text-right">Pendentes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamBreakdown.map((member) => (
                            <TableRow key={member.name}>
                              <TableCell className="min-w-[180px] font-medium text-foreground">{member.name}</TableCell>
                              <TableCell className="text-right text-foreground">{formatCurrency(member.objetivo)}</TableCell>
                              <TableCell className="text-right text-foreground">{formatCurrency(member.ativos)}</TableCell>
                              <TableCell className="text-right text-foreground">{formatCurrency(member.pendentes)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenTeamView(metric.title)}
                      className="block w-full rounded-2xl border border-border/60 bg-muted/20 px-2 py-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Abrir vista de equipa para ${metric.title}`}
                    >
                      <MiniBarChart data={chartData} color={metric.color} height={168} showLabels />
                    </button>

                    <div className="grid grid-cols-3 gap-2 border-t border-border/70 pt-4">
                      {summaryItems.map((item) => (
                        <div key={item.key} className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-center">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-foreground">{metric.summary[item.key]}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
