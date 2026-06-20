import type { OttoExpression } from "./OttoAvatar";
import type { OttoManagedModal } from "@/stores/useModalStore";

// One step of a guided tour. `targetId` matches a data-otto-target attribute on a
// real element. Steps are authored here (deterministic), never by the LLM.
export interface SpotlightStep {
  targetId?: string;                       // data-otto-target; omit for a centered card
  title: string;
  description: string;
  avatarExpression: OttoExpression;
  arrowPosition?: "top" | "bottom" | "left" | "right";
  action?: "highlight" | "pulse" | "glow";
  navigateTo?: string;                     // route to push before the step shows
  openModal?: Exclude<OttoManagedModal, null>; // open a managed modal before the step
  advanceOnClick?: boolean;                // advance when the user clicks the target
}

export interface TourDef {
  id: string;
  title: string;
  steps: SpotlightStep[];
}

// The catalogue Otto can launch via a [tour:<id>] token. Keep ids stable — they
// are part of the contract with the model prompt.
//
// Note: WhatsApp is NOT a tour — it opens the real connection modal (with the QR
// + built-in instructions) via the [modal:whatsapp] token. Faturação/Brevo/dados
// da empresa are handled autonomously by Otto's write tools (paste the value in
// chat, Otto saves it), so they are not tours either. Tours are reserved for
// "show me where to click" flows whose target lives on a reachable page.
export const TOURS: Record<string, TourDef> = {
  setup_pipeline: {
    id: "setup_pipeline",
    title: "Configurar o pipeline",
    steps: [
      {
        targetId: "settings-pipeline-add",
        navigateTo: "/settings?og=sales&os=sales-pipeline",
        title: "Cria as tuas etapas",
        description: "Carrega em Adicionar para construíres o teu funil de vendas, etapa a etapa.",
        avatarExpression: "pointing",
        arrowPosition: "top",
        action: "pulse",
        advanceOnClick: true,
      },
    ],
  },
  invite_member: {
    id: "invite_member",
    title: "Convidar a equipa",
    steps: [
      {
        targetId: "settings-invite-member",
        navigateTo: "/settings?og=team&os=team-access",
        title: "Adiciona um colega",
        description: "Carrega em Adicionar Acesso para convidares um membro e definires as permissões dele.",
        avatarExpression: "pointing",
        arrowPosition: "top",
        action: "pulse",
        advanceOnClick: true,
      },
    ],
  },
  import_leads: {
    id: "import_leads",
    title: "Importar leads",
    steps: [
      {
        targetId: "leads-import-btn",
        navigateTo: "/leads",
        title: "Importa as tuas leads",
        description: "Carrega em Importar para carregares um ficheiro CSV ou Excel com os teus contactos.",
        avatarExpression: "pointing",
        arrowPosition: "bottom",
        action: "pulse",
        advanceOnClick: true,
      },
    ],
  },
};

export function getTour(id: string): TourDef | null {
  return TOURS[id] ?? null;
}
