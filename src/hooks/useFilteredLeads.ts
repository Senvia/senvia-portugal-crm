import { useMemo } from "react";
import { useLeads } from "@/hooks/useLeads";
import { usePaidTrafficFilter } from "@/contexts/PaidTrafficFilterContext";
import { getTrafficMatcher } from "@/lib/paid-traffic";
import type { Lead } from "@/types";

/**
 * Same shape as `useLeads()` — returns `{ data, isLoading, ... }` — but the
 * `data` array is filtered by the Dashboard traffic-source dropdown.
 * When the filter is "all", returns the full list unchanged.
 */
export function useFilteredLeads() {
  const query = useLeads();
  const { filterKey } = usePaidTrafficFilter();

  const data = useMemo<Lead[]>(() => {
    const leads = query.data || [];
    if (filterKey === "all") return leads;
    const matcher = getTrafficMatcher(filterKey);
    return leads.filter((l) => matcher(l.source));
  }, [query.data, filterKey]);

  return { ...query, data };
}
