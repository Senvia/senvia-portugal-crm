import * as React from "react";

// Matches Tailwind's `lg` (1024px) — the breakpoint the rest of the app
// already uses to mean "there's a real desktop sidebar" (dialog.tsx's
// fullScreen variant, sticky form columns, etc). Below 1024 this now means a
// tablet in landscape gets the mobile chrome (bottom nav, hamburger) instead
// of the fixed desktop sidebar squeezing it into half the screen.
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(true);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
