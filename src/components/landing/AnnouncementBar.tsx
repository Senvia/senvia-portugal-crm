import { useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="relative bg-gradient-to-r from-primary to-blue-500 text-white text-center py-2.5 px-4 text-sm font-medium">
      <span className="hidden sm:inline">🎉 Teste grátis durante 14 dias — sem cartão de crédito.</span>
      <span className="sm:hidden">🎉 14 dias grátis — sem cartão</span>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
