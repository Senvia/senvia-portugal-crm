import { ChevronRight, Building, Users, UsersRound, Palette, Link2, Package, GitBranch, LayoutGrid, UserCheck, Zap, Receipt, Shield, IdCard, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsSection = "general" | "security" | "team" | "profiles" | "teams" | "pipeline" | "modules" | "form" | "products" | "clients" | "integrations" | "alerts" | "expenses";

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

interface SectionGroup {
  groupLabel: string;
  items: SectionItem[];
}

const sectionGroups: SectionGroup[] = [
  {
    groupLabel: "Definições Gerais",
    items: [
      { id: "general", label: "Geral", icon: Building, description: "Organização e conta" },
      { id: "security", label: "Segurança", icon: Shield, description: "Password e autenticação 2FA" },
      { id: "pipeline", label: "Pipeline", icon: GitBranch, description: "Etapas de venda", requiresIntegrations: true },
      { id: "modules", label: "Módulos", icon: LayoutGrid, description: "Funcionalidades ativas", requiresIntegrations: true },
      { id: "form", label: "Formulário", icon: Palette, description: "Personalizar aparência", requiresIntegrations: true },
      { id: "clients", label: "Campos", icon: UserCheck, description: "Visibilidade e obrigatoriedade", requiresIntegrations: true },
    ],
  },
  {
    groupLabel: "Equipa",
    items: [
      { id: "team", label: "Acessos", icon: KeyRound, description: "Gerir utilizadores e permissões", requiresTeam: true },
      { id: "profiles", label: "Perfis", icon: IdCard, description: "Perfis de acesso", requiresTeam: true },
      { id: "teams", label: "Equipas", icon: UsersRound, description: "Equipas hierárquicas e líderes", requiresTeam: true },
    ],
  },
  {
    groupLabel: "Produtos",
    items: [
      { id: "products", label: "Produtos", icon: Package, description: "Catálogo para propostas", requiresIntegrations: true },
    ],
  },
  {
    groupLabel: "Financeiro",
    items: [
      { id: "expenses", label: "Despesas", icon: Receipt, description: "Tipos de despesas", requiresIntegrations: true },
    ],
  },
  {
    groupLabel: "Notificações",
    items: [
      { id: "alerts", label: "Alertas", icon: Zap, description: "Notificações de fidelização", requiresIntegrations: true },
    ],
  },
  {
    groupLabel: "Integrações",
    items: [
      { id: "integrations", label: "Integrações", icon: Link2, description: "Webhook, WhatsApp, IA", requiresIntegrations: true },
    ],
  },
];

export function MobileSettingsNav({ 
  activeSection, 
  onSelectSection, 
  canManageTeam, 
  canManageIntegrations 
}: MobileSettingsNavProps) {
  return (
    <div className="space-y-6">
      {sectionGroups.map((group) => {
        const visibleItems = group.items.filter(item => {
          if (item.requiresTeam && !canManageTeam) return false;
          if (item.requiresIntegrations && !canManageIntegrations) return false;
          return true;
        });

        if (visibleItems.length === 0) return null;

        return (
          <div key={group.groupLabel}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {group.groupLabel}
            </p>
            <div className="space-y-2">
              {visibleItems.map((section) => (
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
          </div>
        );
      })}
    </div>
  );
}
