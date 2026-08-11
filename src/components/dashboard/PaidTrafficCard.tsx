import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { usePaidTrafficFilter } from "@/contexts/PaidTrafficFilterContext";
import { useDashboardPeriod } from "@/stores/useDashboardPeriod";
import { getTrafficMatcher, isPaidFilter } from "@/lib/paid-traffic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MousePointerClick } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { pt } from "date-fns/locale";

// Filtro PostgREST: apanha qualquer source que contenha "ads", "pago", "paid"
// ou que seja uma das origens exactas conhecidas.
const PAID_FILTER = [
  "source.ilike.%ads%",
  "source.ilike.%pago%",
  "source.ilike.%paid%",
  "source.eq.Webhook Externo",
].join(",");

export function PaidTrafficCard() {
  const { organization } = useAuth();
  const { data: stages = [] } = usePipelineStages();
  const { filterKey } = usePaidTrafficFilter();
  // Segue o filtro de data do dashboard, como todos os outros painéis. Este
  // cartão tinha um seletor de mês PRÓPRIO, por omissão em "Todo o histórico",
  // por isso mudar o período do dashboard não lhe mexia — dois filtros de data
  // no mesmo ecrã, e o global aparentemente sem efeito.
  const { selectedMonth } = useDashboardPeriod();
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(monthStart);

  const wonKeys = stages.filter((s) => s.is_final_positive).map((s) => s.key);
  const FALLBACK_WON = ["won", "fechado", "ganho", "closed", "convertido"];

  const { data, isLoading } = useQuery({
    queryKey: [
      "paid-traffic-conversions", organization?.id, wonKeys.join(","),
      format(monthStart, "yyyy-MM-dd"), filterKey,
    ],
    queryFn: async () => {
      if (!organization?.id) return null;

      // When the dashboard filter is "all", we still show only paid traffic in
      // this card (it's the "Tráfego Pago" card). When a specific platform is
      // selected, we fetch ALL leads and filter in memory by the matcher, so
      // the card reflects the selected platform.
      const usePaidRestFilter = filterKey === "all" || filterKey === "paid-all";

      let query = supabase
        .from("leads")
        .select("id, status, value, source, created_at")
        .eq("organization_id", organization.id)
        .is("archived_at", null);

      if (usePaidRestFilter) {
        query = query.or(PAID_FILTER);
      }

      // Restringe às leads que ENTRARAM no mês selecionado (por data de criação).
      query = query
        .gte("created_at", `${format(monthStart, "yyyy-MM-dd")}T00:00:00`)
        .lte("created_at", `${format(monthEnd, "yyyy-MM-dd")}T23:59:59`);

      const { data: leads, error } = await query;
      if (error) throw error;

      let list = leads ?? [];

      // When a specific platform is selected (not "all" and not "paid-all"),
      // apply the in-memory matcher to filter by that platform.
      if (isPaidFilter(filterKey) && filterKey !== "paid-all") {
        const matcher = getTrafficMatcher(filterKey);
        list = list.filter((l) => matcher(l.source));
      }

      const total = list.length;
      const lowerWonKeys = wonKeys.map((k) => k.toLowerCase());
      const keys = lowerWonKeys.length > 0 ? lowerWonKeys : FALLBACK_WON;
      // Das leads que entraram, quantas já estão numa fase final de "ganho/fechado".
      const converted = list.filter((l) => keys.includes((l.status ?? "").toLowerCase()));
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

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <MousePointerClick className="h-4 w-4" />
            Tráfego Pago
          </CardTitle>
          <span className="text-xs capitalize text-muted-foreground">
            {format(monthStart, "MMMM yyyy", { locale: pt })}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">{isLoading ? "…" : data?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Leads captados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {isLoading ? "…" : data?.converted ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Fechados</p>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-2xl font-bold">{isLoading ? "…" : `${data?.rate ?? 0}%`}</p>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Taxa de conversão</p>
          </div>
        </div>
        {(data?.revenue ?? 0) > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Receita gerada:{" "}
              <span className="font-semibold text-foreground">
                {(data!.revenue).toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
              </span>
            </p>
          </div>
        )}
        <p className="mt-2 text-[10px] text-muted-foreground/70">
          Leads de tráfego pago que entraram no mês selecionado no dashboard.
        </p>
      </CardContent>
    </Card>
  );
}
