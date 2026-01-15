import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";

interface MiniBarChartProps {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  showLabels?: boolean;
}

export function MiniBarChart({ 
  data, 
  color = "hsl(var(--primary))", 
  height = 60,
  showLabels = false 
}: MiniBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Sem dados
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: showLabels ? 20 : 0 }}>
        {showLabels && (
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
        )}
        <Bar
          dataKey="value"
          fill={color}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
