import { Fingerprint } from "lucide-react";
import { PortalTotalLinkEmptyState } from "@/components/portal-total-link/PortalTotalLinkEmptyState";

export default function PortalTotalLinkIdsPage() {
  return (
    <PortalTotalLinkEmptyState
      eyebrow="ID´s"
      title="Área de ID´s"
      description="Secção preparada para revisão e organização de identificadores associados aos processos do portal."
      icon={Fingerprint}
      columns={["Identificador", "Cliente", "Contrato", "Estado BO"]}
      note="O fluxo de revisão será ligado depois; por agora a interface já suporta navegação própria, filtros globais e ação contextual."
    />
  );
}
