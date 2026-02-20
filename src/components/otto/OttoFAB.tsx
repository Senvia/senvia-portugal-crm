import { Button } from "@/components/ui/button";
import { OttoChatWindow } from "./OttoChatWindow";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";
import { useOttoStore } from "@/stores/useOttoStore";
import ottoMascot from "@/assets/otto-mascot.svg";

export function OttoFAB() {
  const { isOpen, setOpen } = useOttoStore();
  const isMobile = useIsMobile();

  return (
    <>
      <AnimatePresence>{isOpen && <OttoChatWindow onClose={() => setOpen(false)} />}</AnimatePresence>

      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`fixed z-50 ${
            isMobile ? "bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4" : "bottom-6 right-6"
          }`}
        >
          <Button
            onClick={() => setOpen(true)}
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
