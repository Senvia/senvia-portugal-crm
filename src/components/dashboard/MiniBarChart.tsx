import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis } from "recharts";

type SingleBarDatum = { name: string; value: number };
type GroupedBarDatum = {
  name: string;
  objetivo: number;
  ativos: number;
  pendentes: number;
};

interface MiniBarChartProps {
  data: SingleBarDatum[] | GroupedBarDatum[];
  color?: string;
  height?: number;
  showLabels?: boolean;
  mode?: "single" | "grouped";
}

const metricColors: Record<string, string> = {
  objetivo: "hsl(var(--primary))",
  ativos: "hsl(var(--success))",
  pendentes: "hsl(var(--warning))",
};

function getMetricColor(name: string, fallback: string) {
  return metricColors[name.trim().toLowerCase()] ?? fallback;
}

export function MiniBarChart({
  data,
  color = "hsl(var(--primary))",
  height = 60,
  showLabels = false,
  mode = "single",
}: MiniBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Sem dados
      </div>
    );
  }

  const isGrouped = mode === "grouped";
  const bottomMargin = isGrouped ? 72 : showLabels ? 20 : 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: 8, bottom: bottomMargin }}
        barGap={isGrouped ? 4 : 0}
        barCategoryGap={isGrouped ? "28%" : "40%"}
      >
        {isGrouped && <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />}

        {(showLabels || isGrouped) && (
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            interval={0}
            height={isGrouped ? 64 : undefined}
            angle={isGrouped ? -35 : 0}
            textAnchor={isGrouped ? "end" : "middle"}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
        )}

        {isGrouped ? (
          <>
            <Bar dataKey="objetivo" name="Objetivo" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="ativos" name="Ativos" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="pendentes" name="Pendentes" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </>
        ) : (
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {(data as SingleBarDatum[]).map((entry) => (
              <Cell key={entry.name} fill={getMetricColor(entry.name, color)} />
            ))}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

