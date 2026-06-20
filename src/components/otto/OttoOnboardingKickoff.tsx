import { MessageSquare, Receipt, Mail, UsersRound, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OttoAvatar } from "./OttoAvatar";
import { useOttoOnboarding } from "@/hooks/useOttoOnboarding";
import { useTourStore } from "@/stores/useTourStore";
import { useModalStore } from "@/stores/useModalStore";
import { useOttoStore } from "@/stores/useOttoStore";

interface OttoOnboardingKickoffProps {
  // The chat's send handler (used for the autonomous steps Otto does in-chat).
  onSend: (text: string) => void;
}

// The proactive "let's set up your CRM" menu Otto shows on first access. Each
// button launches the matching guide: WhatsApp opens the real modal, team/leads
// run spotlight tours, faturação/Brevo are handled in-chat by Otto.
export function OttoOnboardingKickoff({ onSend }: OttoOnboardingKickoffProps) {
  const { showBadge, steps } = useOttoOnboarding();
  const startTour = useTourStore((s) => s.start);
  const openModal = useModalStore((s) => s.openModal);
  const setOpen = useOttoStore((s) => s.setOpen);

  if (!showBadge) return null;

  const done = (key: string) => steps.find((s) => s.key === key)?.done;

  const launchModal = (id: "whatsapp") => { setOpen(false); openModal(id); };
  const launchTour = (id: string) => { setOpen(false); startTour(id); };

  // Build the action list, hiding steps that are already done.
  const actions: { label: string; icon: React.ElementType; run: () => void }[] = [];
  actions.push({ label: "Ligar o WhatsApp", icon: MessageSquare, run: () => launchModal("whatsapp") });
  if (!done("invoicing")) actions.push({ label: "Configurar a faturação", icon: Receipt, run: () => onSend("Quero configurar a faturação da minha empresa.") });
  if (!done("integrations")) actions.push({ label: "Ligar o Brevo (email)", icon: Mail, run: () => onSend("Quero ligar o Brevo para email marketing.") });
  if (!done("team")) actions.push({ label: "Convidar a equipa", icon: UsersRound, run: () => launchTour("invite_member") });
  if (!done("leads")) actions.push({ label: "Importar leads", icon: Upload, run: () => launchTour("import_leads") });

  return (
    <div className="space-y-3">
      <div className="flex gap-2.5">
        <OttoAvatar expression="happy" size="md" />
        <div className="rounded-2xl rounded-tl-md bg-muted px-3.5 py-2.5 text-sm">
          <p className="font-medium">Boas-vindas ao Senvia OS! 👋</p>
          <p className="mt-1 text-muted-foreground">
            O teu pipeline já está pronto. Vamos pôr o resto a postos, é rápido. Por onde queres começar?
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 pl-9">
        {actions.map((a) => (
          <Button
            key={a.label}
            variant="outline"
            size="sm"
            className="h-auto w-full justify-start gap-2 rounded-xl py-2 px-3 text-xs"
            onClick={a.run}
          >
            <a.icon className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            {a.label}
          </Button>
        ))}
        <p className="mt-1 text-[11px] text-muted-foreground">Ou escreve-me o que precisares.</p>
      </div>
    </div>
  );
}
