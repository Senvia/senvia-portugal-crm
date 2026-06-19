import { useEffect, useState } from "react";

export interface VisualViewportState {
  /** Visible height in px (shrinks when the on-screen keyboard opens). */
  height: number;
  /** True once the visible area drops far enough below the layout viewport. */
  keyboardOpen: boolean;
}

// Tracks the visual viewport HEIGHT so a mobile/PWA conversation view can be sized
// to the visible area, keeping a fixed header + composer in place while the
// on-screen keyboard opens and closes.
//
// We deliberately track ONLY the height (and a derived keyboardOpen flag), not the
// scroll offset. On iOS Safari the visual viewport fires a storm of `scroll` events
// while you drag — if we turned those into layout changes (resizing/translating the
// overlay), the conversation would shake/flicker and the inner list couldn't scroll.
// The page itself is body-locked while the overlay is up, so the viewport top stays
// aligned and no offset compensation is needed.
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => ({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    keyboardOpen: false,
  }));

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : undefined;
    if (!vv) return;

    const update = () => {
      // Round to whole px so sub-pixel jitter during a drag doesn't churn the layout.
      const height = Math.round(vv.height);
      // A drop of >150px below the layout viewport is a keyboard, not a toolbar.
      const keyboardOpen = window.innerHeight - vv.height > 150;
      // Only re-render when the height or keyboard state actually changes — this is
      // what filters out the iOS scroll-event storm (which leaves height untouched).
      setState((prev) =>
        prev.height === height && prev.keyboardOpen === keyboardOpen ? prev : { height, keyboardOpen },
      );
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}
