import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TrendingUp, MousePointerClick } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { pt } from "date-fns/locale";

// Filtro PostgREST: apanha qualquer source que contenha "ads", "pago", "paid"
// ou que seja uma das origens exactas conhecidas.
const PAID_FILTER = [
  "source.ilike.%ads%",
  "source.ilike.%pago%",
  "source.ilike.%paid%",
  "source.eq.Webhook Externo",
].join(",");

// "Todo o histórico" + os últimos 12 meses, para o seletor de período.
function buildMonthOptions() {
  const opts: { value: string; label: string }[] = [{ value: "all", label: "Todo o histórico" }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = startOfMonth(subMonths(now, i));
    opts.push({ value: format(d, "yyyy-MM-dd"), label: format(d, "MMMM yyyy", { locale: pt }) });
  }
  return opts;
}

export function PaidTrafficCard() {
  const { organization } = useAuth();
  const { data: stages = [] } = usePipelineStages();
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  // "all" = todo o histórico; caso contrário, o início do mês selecionado (yyyy-MM-dd).
  const [period, setPeriod] = useState("all");

  const wonKeys = stages.filter((s) => s.is_final_positive).map((s) => s.key);
  const FALLBACK_WON = ["won", "fechado", "ganho", "closed", "convertido"];

  const { data, isLoading } = useQuery({
    queryKey: ["paid-traffic-conversions", organization?.id, wonKeys.join(","), period],
    queryFn: async () => {
      if (!organization?.id) return null;

      let query = supabase
        .from("leads")
        .select("id, status, value, source, created_at")
        .eq("organization_id", organization.id)
        .is("archived_at", null)
        .or(PAID_FILTER);

      // Restringe às leads que ENTRARAM no mês selecionado (por data de criação).
      if (period !== "all") {
        const start = new Date(period);
        const monthEnd = endOfMonth(start);
        query = query
          .gte("created_at", `${format(start, "yyyy-MM-dd")}T00:00:00`)
          .lte("created_at", `${format(monthEnd, "yyyy-MM-dd")}T23:59:59`);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      const list = leads ?? [];
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
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-7 w-[150px] text-xs capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs capitalize">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          {period === "all"
            ? "Todas as leads de tráfego pago (todo o histórico)."
            : "Leads de tráfego pago que entraram no mês selecionado."}
        </p>
      </CardContent>
    </Card>
  );
}
