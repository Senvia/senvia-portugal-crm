import { ConnectWhatsAppModal } from "@/components/settings/ConnectWhatsAppModal";
import { useModalStore } from "@/stores/useModalStore";

// Renders the real configuration modals that Otto (or its tours) can open from
// anywhere via useModalStore — decoupling them from the page that normally hosts
// them. Add new managed modals here as they are wired.
export function OttoModalHost() {
  const { activeModal, params, closeModal } = useModalStore();

  return (
    <>
      <ConnectWhatsAppModal
        open={activeModal === "whatsapp"}
        onOpenChange={(o) => { if (!o) closeModal(); }}
        label={typeof params.label === "string" ? params.label : undefined}
      />
    </>
  );
}
