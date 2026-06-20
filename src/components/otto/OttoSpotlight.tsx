import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { useTourStore } from "@/stores/useTourStore";
import { useModalStore } from "@/stores/useModalStore";
import { getTour } from "./tours";
import { OttoStepCard } from "./OttoStepCard";

interface Rect { top: number; left: number; width: number; height: number; }

const PADDING = 8;        // halo around the target
const FIND_TIMEOUT = 3500; // give the target this long to mount after navigation

// Renders the dim overlay + spotlight hole + arrow + Otto step card for the
// active tour. Resilient: if the target never mounts, it falls back to a centered
// card so the tour still narrates instead of crashing.
export function OttoSpotlight() {
  const { tourId, step, next, stop } = useTourStore();
  const openModal = useModalStore((s) => s.openModal);
  const navigate = useNavigate();
  const location = useLocation();

  const [rect, setRect] = useState<Rect | null>(null);
  const [resolved, setResolved] = useState(false); // step setup finished (found or fallback)
  const targetElRef = useRef<HTMLElement | null>(null);

  const tour = tourId ? getTour(tourId) : null;
  const stepDef = tour ? tour.steps[step] : null;

  // Auto-stop if the step index runs past the end.
  useEffect(() => {
    if (tour && step >= tour.steps.length) stop();
  }, [tour, step, stop]);

  const handleNext = useCallback(() => {
    if (!tour) return;
    if (step >= tour.steps.length - 1) stop();
    else next();
  }, [tour, step, next, stop]);

  // Run per-step setup: navigate, open modal, then locate the target element.
  useEffect(() => {
    if (!tour || !stepDef) return;
    let cancelled = false;
    setResolved(false);
    setRect(null);
    targetElRef.current = null;

    // 1. Navigate if needed.
    if (stepDef.navigateTo) {
      const current = location.pathname + location.search;
      if (current !== stepDef.navigateTo) navigate(stepDef.navigateTo);
    }
    // 2. Open a managed modal if needed.
    if (stepDef.openModal) openModal(stepDef.openModal);

    // 3. If no target, this is a centered card — resolve immediately.
    if (!stepDef.targetId) {
      setResolved(true);
      return;
    }

    // 4. Poll for the target to mount (handles route change + lazy render).
    const started = Date.now();
    const tick = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-otto-target="${stepDef.targetId}"]`);
      if (el) {
        targetElRef.current = el;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setResolved(true);
        return;
      }
      if (Date.now() - started > FIND_TIMEOUT) {
        setResolved(true); // give up → centered fallback
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId, step]);

  // Keep the hole aligned on scroll/resize.
  useEffect(() => {
    if (!rect || !targetElRef.current) return;
    const update = () => {
      const el = targetElRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [rect]);

  // Advance when the user clicks the highlighted element.
  useEffect(() => {
    if (!stepDef?.advanceOnClick || !targetElRef.current) return;
    const el = targetElRef.current;
    const onClick = () => setTimeout(handleNext, 150);
    el.addEventListener("click", onClick, { once: true });
    return () => el.removeEventListener("click", onClick);
  }, [stepDef, resolved, handleNext]);

  if (!tour || !stepDef || !resolved) return null;

  const hole = rect
    ? { top: rect.top - PADDING, left: rect.left - PADDING, width: rect.width + PADDING * 2, height: rect.height + PADDING * 2 }
    : null;

  // Card placement: near the target if we have one, else centered.
  const cardStyle: React.CSSProperties = hole
    ? (() => {
        const below = hole.top + hole.height + 12;
        const fitsBelow = below + 160 < window.innerHeight;
        const top = fitsBelow ? below : Math.max(12, hole.top - 12 - 160);
        let left = hole.left + hole.width / 2 - 150;
        left = Math.max(12, Math.min(left, window.innerWidth - 312));
        return { position: "fixed", top, left, zIndex: 100001 };
      })()
    : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 100001 };

  return createPortal(
    <div className="fixed inset-0 z-[100000]" style={{ pointerEvents: "none" }}>
      {/* Dim + spotlight hole. Box-shadow paints the dim; the hole stays clickable. */}
      {hole ? (
        <motion.div
          key={`${tourId}-${step}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute rounded-xl otto-spotlight-hole"
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" style={{ pointerEvents: "auto" }} />
      )}

      {/* Pulsing ring on the target. */}
      {hole && (
        <div
          className={`absolute rounded-xl ${stepDef.action === "glow" ? "otto-glow" : "otto-pulse"}`}
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
        />
      )}

      <AnimatePresence mode="wait">
        <OttoStepCard
          key={`${tourId}-${step}`}
          step={stepDef}
          index={step}
          total={tour.steps.length}
          onNext={handleNext}
          onSkip={handleNext}
          onExit={stop}
          style={cardStyle}
        />
      </AnimatePresence>
    </div>,
    document.body,
  );
}
