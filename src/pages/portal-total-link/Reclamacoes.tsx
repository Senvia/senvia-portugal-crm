import { MessageSquareText } from "lucide-react";
import { PortalTotalLinkEmptyState } from "@/components/portal-total-link/PortalTotalLinkEmptyState";

export default function PortalTotalLinkReclamacoesPage() {
  return (
    <PortalTotalLinkEmptyState
      eyebrow="Reclamações"
      title="Área de reclamações"
      description="Estrutura pronta para registo, pesquisa e acompanhamento de reclamações do Portal Total Link."
      icon={MessageSquareText}
      columns={["Cliente", "Contrato", "Estado comercial", "Prioridade"]}
      note="O desenho desta área já está preparado para encaixar a futura listagem de reclamações com os mesmos filtros globais do portal."
    />
  );
}
