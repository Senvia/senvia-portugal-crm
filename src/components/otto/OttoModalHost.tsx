import { AddLeadModal } from "@/components/leads/AddLeadModal";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { CreateSaleModal } from "@/components/sales/CreateSaleModal";
import { CreateProposalModal } from "@/components/proposals/CreateProposalModal";
import { useModalStore } from "@/stores/useModalStore";

// Renders the real configuration + creation modals that Otto (or its tours) can
// open from anywhere via useModalStore — decoupling them from the page that
// normally hosts them. So Otto SHOWS the actual form instead of describing it in
// text. `params` can carry prefill (initialData / clientId) when Otto already
// knows the data. Creation modals are mounted only while active so their queries
// don't run app-wide. Add new managed modals here as they are wired.
export function OttoModalHost() {
  const { activeModal, params, closeModal } = useModalStore();
  const onOpenChange = (o: boolean) => { if (!o) closeModal(); };

  return (
    <>
      {/* O modal de ligar WhatsApp foi removido com o resto da integração. */}
      {activeModal === "add_lead" && (
        <AddLeadModal open onOpenChange={onOpenChange} initialData={params.initialData} />
      )}
      {activeModal === "add_client" && (
        <CreateClientModal open onOpenChange={onOpenChange} initialData={params.initialData} />
      )}
      {activeModal === "create_sale" && (
        <CreateSaleModal open onOpenChange={onOpenChange} prefillClientId={params.clientId ?? null} />
      )}
      {activeModal === "create_proposal" && (
        <CreateProposalModal open onOpenChange={onOpenChange} preselectedClientId={params.clientId ?? null} />
      )}
    </>
  );
}
