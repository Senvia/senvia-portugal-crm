import { useEffect, useState } from "react";

export interface VisualViewportState {
  /** Visible height in px (shrinks when the on-screen keyboard opens). */
  height: number;
  /** Vertical offset of the visual viewport within the layout viewport (iOS). */
  offsetTop: number;
  /** True once the visible area drops far enough below the layout viewport. */
  keyboardOpen: boolean;
}

// Tracks the visual viewport so a mobile/PWA conversation view can be sized and
// positioned to the visible area, keeping a fixed header + composer glued in place
// while the on-screen keyboard opens and closes.
//
// IMPORTANT (iOS): the overlay must compensate for `offsetTop` using the CSS `top`
// property, NOT a CSS `transform` — a transform on the overlay breaks touch scrolling
// of the messages list inside it on iOS Safari. Values are rounded and we only
// re-render on a real change, so the iOS scroll-event storm doesn't churn the layout.
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => ({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    offsetTop: 0,
    keyboardOpen: false,
  }));

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : undefined;
    if (!vv) return;

    const update = () => {
      // Round to whole px so sub-pixel jitter during a drag doesn't churn the layout.
      const height = Math.round(vv.height);
      const offsetTop = Math.round(vv.offsetTop);
      // A drop of >150px below the layout viewport is a keyboard, not a toolbar.
      const keyboardOpen = window.innerHeight - vv.height > 150;
      setState((prev) =>
        prev.height === height && prev.offsetTop === offsetTop && prev.keyboardOpen === keyboardOpen
          ? prev
          : { height, offsetTop, keyboardOpen },
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
