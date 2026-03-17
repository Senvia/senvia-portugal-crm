import { FileText } from "lucide-react";
import { PortalTotalLinkEmptyState } from "@/components/portal-total-link/PortalTotalLinkEmptyState";

export default function PortalTotalLinkContratosPage() {
  return (
    <PortalTotalLinkEmptyState
      eyebrow="Contratos"
      title="Área de contratos"
      description="Estrutura visual pronta para receber listagem, pesquisa e ações rápidas sobre contratos."
      icon={FileText}
      columns={["Cliente", "Contrato", "Ciclo", "Estado comercial"]}
      note="Nesta fase a secção mostra apenas a arquitetura visual da listagem de contratos e o botão contextual Adicionar."
    />
  );
}
