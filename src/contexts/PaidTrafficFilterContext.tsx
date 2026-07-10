import { createContext, useContext, useCallback, ReactNode } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";

const STORAGE_KEY = "dashboard-paid-traffic-only-v1";

interface PaidTrafficFilterContextValue {
  paidOnly: boolean;
  toggle: () => void;
  setPaidOnly: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const PaidTrafficFilterContext = createContext<PaidTrafficFilterContextValue | undefined>(undefined);

export function PaidTrafficFilterProvider({ children }: { children: ReactNode }) {
  const [paidOnly, setPaidOnly] = usePersistedState<boolean>(STORAGE_KEY, false);

  const toggle = useCallback(() => {
    setPaidOnly((prev) => !prev);
  }, [setPaidOnly]);

  return (
    <PaidTrafficFilterContext.Provider value={{ paidOnly, toggle, setPaidOnly }}>
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
