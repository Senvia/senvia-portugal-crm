import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Desktop sidebar collapse state. Shared by AppSidebar (renders narrow) and
// AppLayout (shrinks the content's left padding to match). Persisted so the
// agent's preference survives reloads.
interface SidebarStore {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    {
      name: "sidebar-collapsed",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
