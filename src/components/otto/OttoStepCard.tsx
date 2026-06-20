import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { OttoAvatar } from "./OttoAvatar";
import type { SpotlightStep } from "./tours";

interface OttoStepCardProps {
  step: SpotlightStep;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
  onExit: () => void;
  style?: React.CSSProperties;
}

// The little Otto card with avatar + text + controls shown next to the spotlight.
export function OttoStepCard({ step, index, total, onNext, onSkip, onExit, style }: OttoStepCardProps) {
  const isLast = index >= total - 1;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={style}
      className="pointer-events-auto w-[300px] max-w-[90vw] rounded-2xl border border-border bg-background p-3.5 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <OttoAvatar expression={step.avatarExpression} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{step.title}</p>
            <button onClick={onExit} className="text-muted-foreground hover:text-foreground" title="Sair">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{index + 1} / {total}</span>
        <div className="flex gap-1.5">
          {!isLast && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSkip}>
              Saltar
            </Button>
          )}
          <Button size="sm" className="h-7 px-3 text-xs" onClick={onNext}>
            {isLast ? "Concluir" : "Seguinte"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
