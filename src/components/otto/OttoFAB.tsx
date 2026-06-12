import { createPortal } from "react-dom";
import { OttoChatWindow } from "./OttoChatWindow";
import { AnimatePresence } from "framer-motion";
import { useOttoStore } from "@/stores/useOttoStore";

// The Otto chat window portal. The floating action button was removed — Otto
// now opens from the sidebar/bottom-nav "Suporte / Otto" entry (useOttoStore).
export function OttoFAB() {
  const { isOpen, setOpen } = useOttoStore();

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence>{isOpen && <OttoChatWindow onClose={() => setOpen(false)} />}</AnimatePresence>
      </div>
    </div>,
    document.body
  );
}
