import { useEffect } from "react";
import { OttoSpotlight } from "./OttoSpotlight";
import { OttoModalHost } from "./OttoModalHost";
import { useOttoOnboarding } from "@/hooks/useOttoOnboarding";
import { useOttoStore } from "@/stores/useOttoStore";
import { useAuth } from "@/contexts/AuthContext";

// Single mount point for Otto's visual layer (spotlight tours + managed modals),
// plus the first-access auto-open: when a fresh org still has setup pending, Otto
// opens itself once and greets with the onboarding kickoff menu.
export function OttoOnboardingUI() {
  const { showBadge, loading } = useOttoOnboarding();
  const setOpen = useOttoStore((s) => s.setOpen);
  const messageCount = useOttoStore((s) => s.messages.length);
  const { organization } = useAuth();
  const orgId = organization?.id;

  useEffect(() => {
    if (loading || !showBadge || !orgId) return;
    // Once per org (persists across sessions), and never on top of an existing chat.
    const key = `otto-autoopen-${orgId}`;
    try { if (localStorage.getItem(key)) return; } catch { return; }
    if (messageCount > 0) return;
    try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
    const t = window.setTimeout(() => setOpen(true), 800); // let the page settle after the wizard
    return () => window.clearTimeout(t);
  }, [loading, showBadge, orgId, messageCount, setOpen]);

  return (
    <>
      <OttoSpotlight />
      <OttoModalHost />
    </>
  );
}
