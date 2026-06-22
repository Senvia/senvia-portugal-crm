import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { OttoAvatar } from "./OttoAvatar";
import { useOttoStore } from "@/stores/useOttoStore";
import { useOttoChat } from "@/hooks/useOttoChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  useModuleOnboarding,
  ROUTE_TO_MODULE,
  PHASE1_MODULES,
  type ActivationModuleKey,
} from "@/hooks/useActivationProgress";

// Per-module script: the short pitch shown in the bubble + the message sent to
// Otto when the user accepts help. No sample data: every path creates REAL data.
const SCRIPTS: Record<ActivationModuleKey, { title: string; body: string; seed: string }> = {
  leads: {
    title: "Vamos encher o teu pipeline?",
    body: "Aqui vivem as tuas leads. Posso ajudar-te a importar os teus contactos reais (Excel/CSV) ou a criar a primeira lead.",
    seed: "Ajuda-me a adicionar as minhas primeiras leads (importar do Excel/CSV ou criar uma).",
  },
  clients: {
    title: "Cria o teu primeiro cliente",
    body: "Aqui geres os teus clientes. Posso criar o primeiro contigo, ou converter uma lead que já tenhas.",
    seed: "Ajuda-me a criar o meu primeiro cliente.",
  },
  sales: {
    title: "Regista a tua primeira venda",
    body: "Este é o momento em que vês o dinheiro a entrar no Senvia OS. Queres registar a tua primeira venda agora?",
    seed: "Ajuda-me a registar a minha primeira venda.",
  },
  proposals: {
    title: "Cria a tua primeira proposta",
    body: "Aqui montas propostas para os teus clientes. Posso guiar-te a criar a primeira em poucos passos.",
    seed: "Ajuda-me a criar a minha primeira proposta.",
  },
  // Fase 2 (peeks ainda não montados, mas o script fica pronto):
  finance: { title: "Configura a faturação", body: "", seed: "Quero configurar a faturação da minha empresa." },
  integrations: { title: "Liga as tuas integrações", body: "", seed: "Quero ligar as minhas integrações (Brevo, WhatsApp...)." },
  inbox: { title: "Liga o teu WhatsApp", body: "", seed: "Quero ligar o meu WhatsApp à caixa de entrada." },
  team: { title: "Convida a tua equipa", body: "", seed: "Quero convidar um colega para a minha equipa." },
};

function moduleForPath(pathname: string): ActivationModuleKey | null {
  for (const [route, mod] of Object.entries(ROUTE_TO_MODULE)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return PHASE1_MODULES.includes(mod) ? mod : null;
    }
  }
  return null;
}

// Single mount point (in AppLayout). Picks the module from the current route and
// shows a soft, non-modal Otto bubble the first time the user lands on it, until
// they engage, complete it, or dismiss it. Never a blocking modal.
export function ModuleOnboardingPeek() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const ottoOpen = useOttoStore((s) => s.isOpen);
  const setOttoOpen = useOttoStore((s) => s.setOpen);
  const { sendMessage } = useOttoChat();

  const moduleKey = moduleForPath(location.pathname);
  const { shouldShow, dismiss } = useModuleOnboarding(moduleKey);

  // Hide while the chat is open (no point peeking over the open assistant).
  const visible = !!moduleKey && shouldShow && !ottoOpen;
  const script = moduleKey ? SCRIPTS[moduleKey] : null;

  const handleAccept = () => {
    if (!script) return;
    setOttoOpen(true);
    sendMessage(script.seed);
  };

  return (
    <AnimatePresence>
      {visible && script && (
        <motion.div
          key={moduleKey}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 320, damping: 26 }}
          className={cn(
            "fixed z-40 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-card p-4 shadow-xl",
            isMobile ? "bottom-24 right-3" : "bottom-6 right-6",
          )}
          role="dialog"
          aria-label="Sugestão do Otto"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dispensar"
            className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex gap-3">
            <OttoAvatar expression="happy" size="sm" />
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-sm font-semibold text-foreground">{script.title}</p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">{script.body}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sim, ajuda-me
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
