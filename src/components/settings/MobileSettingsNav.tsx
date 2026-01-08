import { ChevronRight, Building, Users, Palette, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsSection = "general" | "team" | "form" | "integrations";

interface MobileSettingsNavProps {
  activeSection: SettingsSection | null;
  onSelectSection: (section: SettingsSection) => void;
  canManageTeam: boolean;
  canManageIntegrations: boolean;
}

const sections = [
  { id: "general" as const, label: "Geral", icon: Building, description: "Organização e conta" },
  { id: "team" as const, label: "Equipa", icon: Users, description: "Gerir membros", requiresTeam: true },
  { id: "form" as const, label: "Formulário", icon: Palette, description: "Personalizar aparência", requiresIntegrations: true },
  { id: "integrations" as const, label: "Integrações", icon: Link2, description: "Webhook, WhatsApp, IA", requiresIntegrations: true },
];

export function MobileSettingsNav({ 
  activeSection, 
  onSelectSection, 
  canManageTeam, 
  canManageIntegrations 
}: MobileSettingsNavProps) {
  const visibleSections = sections.filter(section => {
    if (section.requiresTeam && !canManageTeam) return false;
    if (section.requiresIntegrations && !canManageIntegrations) return false;
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
