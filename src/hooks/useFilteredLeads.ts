import { useMemo } from "react";
import { useLeads } from "@/hooks/useLeads";
import { usePaidTrafficFilter } from "@/contexts/PaidTrafficFilterContext";
import { isPaidTraffic } from "@/lib/paid-traffic";
import type { Lead } from "@/types";

/**
 * Same as `useLeads`, but optionally filtered to paid-traffic-only when the
 * Dashboard "Só tráfego pago" toggle is on. Components that read leads from this
 * hook automatically respect the toggle state.
 */
export function useFilteredLeads(): Lead[] {
  const { data: leads = [] } = useLeads();
  const { paidOnly } = usePaidTrafficFilter();

  return useMemo(() => {
    if (!paidOnly) return leads;
    return leads.filter((l) => isPaidTraffic(l.source));
  }, [leads, paidOnly]);
}
