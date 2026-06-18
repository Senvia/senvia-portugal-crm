import { useEffect, useState } from "react";

// Detects whether the on-screen keyboard is (probably) open on mobile/PWA.
//
// Uses the visualViewport API: when the keyboard opens, the visual viewport
// height shrinks well below the layout viewport height. We compare the two and
// flag "open" once the visible area drops past a threshold of the window height.
//
// Returns false on devices/browsers without visualViewport (e.g. desktop), so
// callers can safely gate mobile-only behaviour on it.
export function useKeyboardOpen(thresholdRatio = 0.8): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : undefined;
    if (!vv) return;

    const update = () => {
      // Keyboard open when the visible viewport is noticeably shorter than the
      // full window (and the difference is large enough to be a keyboard, not a
      // browser toolbar collapsing).
      const heightRatio = vv.height / window.innerHeight;
      const shrink = window.innerHeight - vv.height;
      setOpen(heightRatio < thresholdRatio && shrink > 150);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [thresholdRatio]);

  return open;
}
