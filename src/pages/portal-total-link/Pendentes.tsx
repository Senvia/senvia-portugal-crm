import { Clock3 } from "lucide-react";
import { PortalTotalLinkEmptyState } from "@/components/portal-total-link/PortalTotalLinkEmptyState";

export default function PortalTotalLinkPendentesPage() {
  return (
    <PortalTotalLinkEmptyState
      eyebrow="Pendentes"
      title="Área de pendentes"
      description="Painel preparado para destacar operações pendentes, pesquisas rápidas e seguimento de backlog."
      icon={Clock3}
      columns={["Cliente", "Vendedor", "Estado BO", "Última atualização"]}
      note="A secção de Pendentes já está estruturada para receber resultados filtrados e a ação contextual Pesquisar."
    />
  );
}
