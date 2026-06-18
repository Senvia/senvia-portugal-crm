import { useEffect, useState } from "react";

export interface VisualViewportState {
  /** Visible height in px (shrinks when the on-screen keyboard opens). */
  height: number;
  /** Vertical scroll offset of the visual viewport (non-zero on iOS w/ keyboard). */
  offsetTop: number;
  /** True once the visible area drops far enough below the layout viewport. */
  keyboardOpen: boolean;
}

// Tracks the visual viewport so a mobile/PWA conversation view can be sized and
// positioned exactly to the visible area, keeping a fixed header + composer glued
// in place while the on-screen keyboard opens and closes. Works on both Android
// (viewport shrinks from the bottom) and iOS (viewport also shifts via offsetTop).
//
// Relies on the default `interactive-widget=resizes-visual` behaviour: the layout
// viewport (window.innerHeight) stays put while the keyboard only resizes the
// visual viewport, which is how we detect the keyboard and measure the gap.
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
      // A drop of >150px below the layout viewport is a keyboard, not a toolbar.
      const keyboardOpen = window.innerHeight - vv.height > 150;
      // Skip the state update (and the re-render) when nothing actually changed —
      // iOS fires a stream of scroll events during the keyboard animation.
      setState((prev) =>
        prev.height === vv.height && prev.offsetTop === vv.offsetTop && prev.keyboardOpen === keyboardOpen
          ? prev
          : { height: vv.height, offsetTop: vv.offsetTop, keyboardOpen },
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
