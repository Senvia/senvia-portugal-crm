import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, format } from "date-fns";

export interface UserSalesMetrics {
  userId: string;
  nifs: number;
  energia: number; // MWh
  solar: number;   // kWp
  comissao: number;
}

export function useMonthSalesMetrics(referenceDate?: Date) {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const ref = referenceDate || new Date();
  const monthStart = format(startOfMonth(ref), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(ref), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["month-sales-metrics", orgId, monthStart],
    queryFn: async (): Promise<UserSalesMetrics[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("sales")
        .select("created_by, consumo_anual, kwp, comissao, client_id, status")
        .eq("organization_id", orgId)
        .gte("sale_date", monthStart)
        .lte("sale_date", monthEnd)
        .in("status", ["fulfilled", "delivered"]);

      if (error) throw error;
      if (!data) return [];

      // Group by created_by
      const grouped = new Map<string, { contracts: number; energia: number; solar: number; comissao: number }>();

      for (const sale of data) {
        const uid = sale.created_by;
        if (!uid) continue;

        if (!grouped.has(uid)) {
          grouped.set(uid, { contracts: 0, energia: 0, solar: 0, comissao: 0 });
        }
        const g = grouped.get(uid)!;

        g.contracts += 1;
        g.energia += Number(sale.consumo_anual || 0) / 1000; // kWh → MWh
        g.solar += Number(sale.kwp || 0);
        g.comissao += Number(sale.comissao || 0);
      }

      return Array.from(grouped.entries()).map(([userId, g]) => ({
        userId,
        nifs: g.contracts,
        energia: g.energia,
        solar: g.solar,
        comissao: g.comissao,
      }));
    },
    enabled: !!orgId,
  });
}
