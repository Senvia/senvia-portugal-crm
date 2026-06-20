import { motion } from "framer-motion";

const ottoMascot = "/otto-mascot.svg";

export type OttoExpression = "neutral" | "happy" | "confused" | "pointing" | "listening";

interface OttoAvatarProps {
  expression?: OttoExpression;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_PX: Record<NonNullable<OttoAvatarProps["size"]>, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

// Per-expression motion. The mascot is a static SVG; framer-motion gives it
// "life" (floating, nodding, a happy bounce, a confused tilt, a pointing lean).
// This avoids needing Lottie/Rive for the first version while still feeling alive.
const ANIMATIONS: Record<OttoExpression, any> = {
  neutral: { y: [0, -3, 0], rotate: 0, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  happy: { y: [0, -6, 0], scale: [1, 1.06, 1], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.4, ease: "easeOut" } },
  confused: { rotate: [0, -8, 8, -8, 0], transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } },
  pointing: { x: [0, 4, 0], rotate: [0, 4, 0], transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } },
  listening: { scale: [1, 1.03, 1], transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } },
};

// A soft glow ring colour per mood (brand blues, warmer when happy).
const GLOW: Record<OttoExpression, string> = {
  neutral: "rgba(56, 189, 248, 0.0)",
  happy: "rgba(34, 197, 94, 0.45)",
  confused: "rgba(245, 158, 11, 0.4)",
  pointing: "rgba(56, 189, 248, 0.5)",
  listening: "rgba(56, 189, 248, 0.35)",
};

export function OttoAvatar({ expression = "neutral", size = "md", className }: OttoAvatarProps) {
  const px = SIZE_PX[size];
  return (
    <motion.div
      className={`relative shrink-0 rounded-full ${className ?? ""}`}
      style={{ width: px, height: px, boxShadow: `0 0 0 0 ${GLOW[expression]}` }}
      animate={ANIMATIONS[expression]}
      aria-hidden
    >
      <img src={ottoMascot} alt="Otto" className="h-full w-full rounded-full object-cover" />
    </motion.div>
  );
}
