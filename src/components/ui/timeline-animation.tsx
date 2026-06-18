import { motion, useInView, type Variants } from "framer-motion";
import type { ReactNode, RefObject } from "react";

// Reveal-on-scroll wrapper used by the public pricing page. Renders as the given
// tag and animates with the provided variants when `timelineRef` enters view.
// `animationNum` is passed as the motion `custom` value so each item can stagger
// its delay (variants receive it as the function argument).
const MOTION_TAGS: Record<string, any> = {
  div: motion.div,
  span: motion.span,
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  section: motion.section,
};

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export function TimelineContent({
  as = "div",
  children,
  className,
  animationNum,
  timelineRef,
  customVariants,
  once = true,
}: {
  as?: string;
  children: ReactNode;
  className?: string;
  animationNum: number;
  timelineRef: RefObject<HTMLElement | null>;
  customVariants?: Variants;
  once?: boolean;
}) {
  const Comp: any = MOTION_TAGS[as] ?? motion.div;
  const inView = useInView(timelineRef, { once, margin: "0px 0px -10% 0px" });

  return (
    <Comp
      custom={animationNum}
      variants={customVariants ?? defaultVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </Comp>
  );
}
