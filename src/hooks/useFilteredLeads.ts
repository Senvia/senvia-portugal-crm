import { useMemo } from "react";
import { useLeads } from "@/hooks/useLeads";
import { usePaidTrafficFilter } from "@/contexts/PaidTrafficFilterContext";
import { getTrafficMatcher } from "@/lib/paid-traffic";
import type { Lead } from "@/types";

/**
 * Same as `useLeads`, but filtered by the Dashboard traffic-source dropdown.
 * When the filter is "all", returns the full list. When a specific platform
 * or "paid-all" is selected, returns only leads whose `source` matches.
 */
export function useFilteredLeads(): Lead[] {
  const { data: leads = [] } = useLeads();
  const { filterKey } = usePaidTrafficFilter();

  return useMemo(() => {
    const matcher = getTrafficMatcher(filterKey);
    if (filterKey === "all") return leads;
    return leads.filter((l) => matcher(l.source));
  }, [leads, filterKey]);
}
