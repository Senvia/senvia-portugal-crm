import { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OttoChatWindow } from "./OttoChatWindow";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";

export function OttoFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <>
      <AnimatePresence>{isOpen && <OttoChatWindow onClose={() => setIsOpen(false)} />}</AnimatePresence>

      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`fixed z-50 ${
            isMobile ? "bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4" : "bottom-6 right-6"
          }`}
        >
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow gradient-senvia"
            size="icon"
          >
            <Bot className="w-6 h-6" />
          </Button>
        </motion.div>
      )}
    </>
  );
}
