import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniBarChart } from "@/components/dashboard/MiniBarChart";
import { useSearchParams } from "react-router-dom";

const portalHomeMetrics = [
  {
    title: "Angariados",
    color: "hsl(var(--primary))",
    data: [
      { name: "Sem 1", value: 42 },
      { name: "Sem 2", value: 58 },
      { name: "Sem 3", value: 66 },
      { name: "Sem 4", value: 74 },
    ],
    summary: {
      objetivo: 90,
      ativos: 74,
      pendentes: 16,
    },
  },
  {
    title: "Adicionados",
    color: "hsl(var(--secondary-foreground))",
    data: [
      { name: "Sem 1", value: 18 },
      { name: "Sem 2", value: 27 },
      { name: "Sem 3", value: 34 },
      { name: "Sem 4", value: 39 },
    ],
    summary: {
      objetivo: 44,
      ativos: 39,
      pendentes: 5,
    },
  },
  {
    title: "Fidelizados",
    color: "hsl(var(--accent-foreground))",
    data: [
      { name: "Sem 1", value: 11 },
      { name: "Sem 2", value: 16 },
      { name: "Sem 3", value: 20 },
      { name: "Sem 4", value: 24 },
    ],
    summary: {
      objetivo: 28,
      ativos: 24,
      pendentes: 4,
    },
  },
  {
    title: "Residêncial",
    color: "hsl(var(--muted-foreground))",
    data: [
      { name: "Sem 1", value: 26 },
      { name: "Sem 2", value: 31 },
      { name: "Sem 3", value: 35 },
      { name: "Sem 4", value: 41 },
    ],
    summary: {
      objetivo: 48,
      ativos: 41,
      pendentes: 7,
    },
  },
  {
    title: "Novos NIFs",
    color: "hsl(var(--foreground))",
    data: [
      { name: "Sem 1", value: 9 },
      { name: "Sem 2", value: 14 },
      { name: "Sem 3", value: 17 },
      { name: "Sem 4", value: 21 },
    ],
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
  const selectedCycle = searchParams.get("homeCycle") ?? "1";
  const selectedYear = searchParams.get("homeYear") ?? String(new Date().getFullYear());
  const periodLabel = `Ciclo ${selectedCycle} / ${selectedYear} - Global`;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {portalHomeMetrics.map((metric) => (
          <Card key={metric.title} className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="space-y-3 p-5 pb-0">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Portal Total Link</p>
                <CardTitle className="text-xl font-semibold text-foreground">{metric.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{periodLabel}</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-5">
              <div className="rounded-2xl border border-border/60 bg-muted/20 px-2 py-4">
                <MiniBarChart data={metric.data} color={metric.color} height={168} showLabels />
              </div>

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
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
