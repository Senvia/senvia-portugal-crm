import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OttoChatWindow } from "./OttoChatWindow";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";
import { useOttoStore } from "@/stores/useOttoStore";
import ottoMascot from "@/assets/otto-mascot.svg";

const OTTO_BUBBLE_KEY = "otto-bubble-dismissed";

export function OttoFAB() {
  const { isOpen, setOpen } = useOttoStore();
  const isMobile = useIsMobile();
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(OTTO_BUBBLE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setShowBubble(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissBubble = () => {
    setShowBubble(false);
    localStorage.setItem(OTTO_BUBBLE_KEY, "true");
  };

  const handleOpen = () => {
    setOpen(true);
    if (showBubble) dismissBubble();
  };

  return (
    <>
      <AnimatePresence>{isOpen && <OttoChatWindow onClose={() => setOpen(false)} />}</AnimatePresence>

      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`fixed z-[60] ${
            isMobile ? "bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4" : "bottom-6 right-6"
          }`}
        >
          {/* Help bubble */}
          <AnimatePresence>
            {showBubble && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-[calc(100%+12px)] right-0 w-[200px]"
              >
                <div className="relative bg-card border border-border rounded-xl px-3 py-2.5 shadow-lg">
                  <button
                    onClick={(e) => { e.stopPropagation(); dismissBubble(); }}
                    className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <p className="text-xs text-foreground pr-3 leading-relaxed">
                    Precisa de ajuda? Pergunte-me sobre o Senvia OS! 🚀
                  </p>
                  {/* Arrow */}
                  <div className="absolute -bottom-[6px] right-5 w-3 h-3 rotate-45 bg-card border-r border-b border-border" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleOpen}
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow p-0 overflow-hidden"
            size="icon"
          >
            <img src={ottoMascot} alt="Otto" className="w-full h-full object-cover" />
          </Button>
        </motion.div>
      )}
    </>
  );
}
