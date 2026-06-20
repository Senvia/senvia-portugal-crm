import { useEffect, useRef } from "react";
import { OttoSpotlight } from "./OttoSpotlight";
import { OttoModalHost } from "./OttoModalHost";
import { useOttoOnboarding } from "@/hooks/useOttoOnboarding";
import { useOttoStore } from "@/stores/useOttoStore";
import { useAuth } from "@/contexts/AuthContext";

// Single mount point for Otto's visual layer (spotlight tours + managed modals),
// plus the first-access auto-open: while a fresh org still has setup pending AND
// the chat is empty, Otto opens itself and greets with the onboarding kickoff.
//
// Gated only by a per-mount ref (not persistent storage) + "chat is empty", so a
// full page reload (hard refresh) re-triggers the first-access greeting — exactly
// what you want while testing onboarding. Once the user actually chats (messages
// in sessionStorage) it stops nagging until a new session, and once setup is
// complete `showBadge` goes false and it never opens on its own again.
export function OttoOnboardingUI() {
  const { showBadge, loading } = useOttoOnboarding();
  const setOpen = useOttoStore((s) => s.setOpen);
  const messageCount = useOttoStore((s) => s.messages.length);
  const { organization } = useAuth();
  const orgId = organization?.id;
  const openedRef = useRef(false);

  useEffect(() => {
    if (loading || !showBadge || !orgId) return;
    if (openedRef.current) return;     // only once per page load
    if (messageCount > 0) return;      // don't intrude on an existing conversation
    openedRef.current = true;
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
