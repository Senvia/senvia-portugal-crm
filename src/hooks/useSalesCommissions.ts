import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardPeriod } from "@/stores/useDashboardPeriod";
import { startOfMonth, endOfMonth, format } from "date-fns";

export interface CommissionEntry {
  userId: string;
  fullName: string;
  totalSales: number;
  salesCount: number;
  commissionRate: number;
  totalCommission: number;
}

interface SalesSettings {
  commissions_enabled?: boolean;
  commission_percentage?: number | null;
}

export function useSalesCommissions() {
  const { organization, user } = useAuth();
  const orgId = organization?.id;
  const { selectedMonth } = useDashboardPeriod();

  const salesSettings = (organization?.sales_settings as SalesSettings) || {};
  const commissionsEnabled = !!salesSettings.commissions_enabled;
  const globalRate = salesSettings.commission_percentage || null;

  const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["sales-commissions", orgId, monthStart, commissionsEnabled],
    queryFn: async (): Promise<CommissionEntry[]> => {
      if (!orgId || !commissionsEnabled) return [];

      // Fetch sales for the period. `comissao` is the authoritative commission
      // for the sale — set either by the energy CPE engine, the telecom
      // auto-fill trigger (products × multiplier), or manually by the admin.
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("created_by, total_value, comissao")
        .eq("organization_id", orgId)
        .gte("sale_date", monthStart)
        .lte("sale_date", monthEnd)
        .in("status", ["fulfilled", "delivered"]);

      if (salesError) throw salesError;

      // Fetch members for the per-member rate (kept as informational column;
      // the actual commission now comes from sales.comissao).
      const { data: members, error: membersError } = await supabase
        .from("organization_members")
        .select("user_id, commission_rate")
        .eq("organization_id", orgId)
        .eq("is_active", true);

      if (membersError) throw membersError;

      const memberUserIds = (members || []).map(m => m.user_id);
      const { data: profiles } = memberUserIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", memberUserIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
      const memberRateMap = new Map(members?.map(m => [m.user_id, Number(m.commission_rate || 0)]) || []);

      // Group sales by created_by, summing both total_value and the
      // already-computed commission.
      const grouped = new Map<string, { total: number; commission: number; count: number }>();
      for (const sale of sales || []) {
        if (!sale.created_by) continue;
        const current = grouped.get(sale.created_by) || { total: 0, commission: 0, count: 0 };
        current.total += Number(sale.total_value || 0);
        current.commission += Number(sale.comissao || 0);
        current.count += 1;
        grouped.set(sale.created_by, current);
      }

      const entries: CommissionEntry[] = [];
      for (const [userId, data] of grouped) {
        const rate = globalRate && globalRate > 0 ? globalRate : (memberRateMap.get(userId) || 0);
        entries.push({
          userId,
          fullName: profileMap.get(userId) || "Desconhecido",
          totalSales: data.total,
          salesCount: data.count,
          commissionRate: rate,
          totalCommission: data.commission,
        });
      }

      return entries.sort((a, b) => b.totalCommission - a.totalCommission);
    },
    enabled: !!orgId && commissionsEnabled,
  });
}
