import { Home } from "lucide-react";
import { PortalTotalLinkEmptyState } from "@/components/portal-total-link/PortalTotalLinkEmptyState";

export default function PortalTotalLinkHomePage() {
  return (
    <PortalTotalLinkEmptyState
      eyebrow="Home"
      title="Visão geral do Portal Total Link"
      description="Base pronta para pesquisa por cliente e organização operacional do portal sem gravar dados no CRM."
      icon={Home}
      columns={["Pesquisa por NIF", "Resumo por cliente", "Atividade recente", "Atalhos operacionais"]}
      note="A Home ficará preparada para concentrar pesquisa rápida e visão geral assim que a integração oficial estiver disponível."
    />
  );
}
