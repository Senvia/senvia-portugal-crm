import { useEffect, useRef } from "react";

/**
 * Locks the document body scroll while a modal/overlay is open.
 *
 * iOS Safari: when a fixed overlay is open and the user focuses an input, Safari
 * scrolls the page *behind* the overlay to bring the input into view. Locking the
 * body with `overflow: hidden` + `position: fixed` prevents this.
 *
 * Also prevents the background content from scrolling when the user swipes outside
 * the modal — a common complaint on mobile PWA.
 *
 * @param locked - Whether the body should be locked.
 * @param options.allowTouchMove - Optional selector for elements that should still
 *   allow touch scrolling (e.g. the modal content itself). Default: none.
 */
export function useBodyLock(
  locked: boolean,
  options?: { allowTouchMove?: string },
) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    scrollYRef.current = window.scrollY;

    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollYRef.current);
    };
  }, [locked]);
}
