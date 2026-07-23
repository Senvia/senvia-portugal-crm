import { createContext, useContext, useCallback, ReactNode } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import type { TrafficFilterKey } from "@/lib/paid-traffic";

const STORAGE_KEY = "dashboard-traffic-filter-v2";

interface PaidTrafficFilterContextValue {
  /** Current filter key (e.g. "all", "paid-all", "meta", "google"). */
  filterKey: TrafficFilterKey;
  /** Set the filter to a specific key. */
  setFilter: (key: TrafficFilterKey) => void;
  /** Convenience: true when filterKey !== "all". */
  isFiltered: boolean;
}

const PaidTrafficFilterContext = createContext<PaidTrafficFilterContextValue | undefined>(undefined);

export function PaidTrafficFilterProvider({ children }: { children: ReactNode }) {
  const [filterKey, setFilterKey] = usePersistedState<TrafficFilterKey>(STORAGE_KEY, "all");

  const setFilter = useCallback(
    (key: TrafficFilterKey) => {
      setFilterKey(key);
    },
    [setFilterKey],
  );

  const isFiltered = filterKey !== "all";

  return (
    <PaidTrafficFilterContext.Provider value={{ filterKey, setFilter, isFiltered }}>
      {children}
    </PaidTrafficFilterContext.Provider>
  );
}

export function usePaidTrafficFilter() {
  const ctx = useContext(PaidTrafficFilterContext);
  if (ctx === undefined) {
    throw new Error("usePaidTrafficFilter must be used within a PaidTrafficFilterProvider");
  }
  return ctx;
}
