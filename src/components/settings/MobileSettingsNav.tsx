import { ChevronRight, Building, Users, UsersRound, Package, Link2, Bell, Receipt, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsSection = "general" | "security" | "team" | "products" | "finance" | "notifications" | "integrations";

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
