import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MousePointerClick } from "lucide-react";

// Filtro PostgREST: apanha qualquer source que contenha "ads", "pago", "paid"
// ou que seja uma das origens exactas conhecidas
const PAID_FILTER = [
  "source.ilike.%ads%",
  "source.ilike.%pago%",
  "source.ilike.%paid%",
  "source.eq.Webhook Externo",
].join(",");

export function PaidTrafficCard() {
  const { organization } = useAuth();
  const { data: stages = [] } = usePipelineStages();

  const wonStageKey = stages.find((s) => s.is_final_positive)?.key ?? "won";

  const { data, isLoading } = useQuery({
    queryKey: ["paid-traffic-conversions", organization?.id, wonStageKey],
    queryFn: async () => {
      if (!organization?.id) return null;

      const { data: leads, error } = await supabase
        .from("leads")
        .select("id, status, value, source")
        .eq("organization_id", organization.id)
        .or(PAID_FILTER);

      if (error) throw error;
      if (!leads || leads.length === 0) return { total: 0, converted: 0, rate: 0, revenue: 0 };

      const total = leads.length;
      const converted = leads.filter((l) => l.status === wonStageKey);
      const revenue = converted.reduce((sum, l) => sum + (l.value ?? 0), 0);

      return {
        total,
        converted: converted.length,
        rate: total > 0 ? Math.round((converted.length / total) * 100) : 0,
        revenue,
      };
    },
    enabled: !!organization?.id && stages.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) return null;

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          <MousePointerClick className="h-4 w-4" />
          Tráfego Pago
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">{data.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Leads captados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.converted}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Convertidos</p>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-2xl font-bold">{data.rate}%</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Taxa de conversão</p>
          </div>
        </div>
        {data.revenue > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Receita gerada:{" "}
              <span className="font-semibold text-foreground">
                {data.revenue.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
