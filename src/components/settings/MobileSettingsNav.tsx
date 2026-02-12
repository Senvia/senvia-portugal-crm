import { ChevronRight, Building, Users, UsersRound, Package, Link2, Bell, Receipt, Shield, Settings, GitBranch, LayoutGrid, FileText, List, KeyRound, UserCog, Network, BellRing, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsSection = "general" | "security" | "team" | "products" | "finance" | "notifications" | "integrations";

export type SettingsSubSection =
  | "org-general" | "org-pipeline" | "org-modules" | "org-forms" | "org-fields"
  | "security"
  | "team-access" | "team-profiles" | "team-teams"
  | "products"
  | "finance-expenses"
  | "notif-push" | "notif-alerts"
  | "integrations";

interface MobileSettingsNavProps {
  activeSection: SettingsSection | null;
  onSelectSection: (section: SettingsSection) => void;
  canManageTeam: boolean;
  canManageIntegrations: boolean;
}

interface SectionItem {
  id: SettingsSection;
  label: string;
  icon: any;
  description: string;
  requiresTeam?: boolean;
  requiresIntegrations?: boolean;
}

const sections: SectionItem[] = [
  { id: "general", label: "Definições Gerais", icon: Building, description: "Organização, pipeline, módulos e formulário" },
  { id: "security", label: "Segurança", icon: Shield, description: "Password e autenticação 2FA" },
  { id: "team", label: "Equipa e Acessos", icon: UsersRound, description: "Utilizadores, perfis e equipas", requiresTeam: true },
  { id: "products", label: "Produtos", icon: Package, description: "Catálogo para propostas", requiresIntegrations: true },
  { id: "finance", label: "Financeiro", icon: Receipt, description: "Tipos de despesas", requiresIntegrations: true },
  { id: "notifications", label: "Notificações", icon: Bell, description: "Push e alertas de fidelização" },
  { id: "integrations", label: "Integrações", icon: Link2, description: "Webhook, WhatsApp, IA", requiresIntegrations: true },
];

export function MobileSettingsNav({ 
  activeSection, 
  onSelectSection, 
  canManageTeam, 
  canManageIntegrations 
}: MobileSettingsNavProps) {
  const visibleSections = sections.filter(item => {
    if (item.requiresTeam && !canManageTeam) return false;
    if (item.requiresIntegrations && !canManageIntegrations) return false;
    return true;
  });

  return (
    <div className="space-y-2">
      {visibleSections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelectSection(section.id)}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left",
            activeSection === section.id
              ? "bg-primary/10 text-primary"
              : "bg-muted/50 hover:bg-muted"
          )}
        >
          <div className={cn(
            "flex items-center justify-center h-10 w-10 rounded-lg",
            activeSection === section.id ? "bg-primary/20" : "bg-background"
          )}>
            <section.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{section.label}</p>
            <p className="text-xs text-muted-foreground truncate">{section.description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

// Sub-section definitions per group
export interface SubSectionItem {
  id: SettingsSubSection;
  label: string;
  icon: any;
  description: string;
}

export const subSectionsMap: Record<SettingsSection, SubSectionItem[]> = {
  general: [
    { id: "org-general", label: "Geral", icon: Building, description: "Organização e conta" },
    { id: "org-pipeline", label: "Pipeline", icon: GitBranch, description: "Etapas do funil de vendas" },
    { id: "org-modules", label: "Módulos", icon: LayoutGrid, description: "Ativar e desativar módulos" },
    { id: "org-forms", label: "Formulário", icon: FileText, description: "Formulários de captura de leads" },
    { id: "org-fields", label: "Campos", icon: List, description: "Campos personalizados de clientes" },
  ],
  security: [], // direct content
  team: [
    { id: "team-access", label: "Acessos", icon: KeyRound, description: "Utilizadores e convites" },
    { id: "team-profiles", label: "Perfis", icon: UserCog, description: "Perfis de permissões" },
    { id: "team-teams", label: "Equipas", icon: Network, description: "Hierarquia e liderança" },
  ],
  products: [], // direct content
  finance: [], // direct content
  notifications: [
    { id: "notif-push", label: "Push", icon: BellRing, description: "Notificações push no browser" },
    { id: "notif-alerts", label: "Alertas", icon: AlertTriangle, description: "Alertas de fidelização" },
  ],
  integrations: [], // direct content
};

interface MobileSubSectionNavProps {
  group: SettingsSection;
  onSelectSubSection: (sub: SettingsSubSection) => void;
}

export function MobileSubSectionNav({ group, onSelectSubSection }: MobileSubSectionNavProps) {
  const items = subSectionsMap[group];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelectSubSection(item.id)}
          className="w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left bg-muted/50 hover:bg-muted"
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-background">
            <item.icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{item.label}</p>
            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

// Groups that go directly to content (no sub-sections)
export const directContentGroups: SettingsSection[] = ["security", "products", "finance", "integrations"];

// Section titles
export const sectionTitles: Record<SettingsSection, string> = {
  general: "Definições Gerais",
  security: "Segurança",
  team: "Equipa e Acessos",
  products: "Produtos",
  finance: "Financeiro",
  notifications: "Notificações",
  integrations: "Integrações",
};
