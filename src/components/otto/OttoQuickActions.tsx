import { Button } from "@/components/ui/button";
import { Users, Target, FileText, Settings, CalendarDays, BarChart3 } from "lucide-react";

const QUICK_ACTIONS = [
  { label: "Como criar um lead?", icon: Target },
  { label: "Gerir pipeline", icon: BarChart3 },
  { label: "Enviar proposta", icon: FileText },
  { label: "Gerir equipa", icon: Users },
  { label: "Agendar reunião", icon: CalendarDays },
  { label: "Configurações", icon: Settings },
];

interface OttoQuickActionsProps {
  onSelect: (text: string) => void;
}

export function OttoQuickActions({ onSelect }: OttoQuickActionsProps) {
  return (
    <div className="space-y-3">
      <div className="bg-muted rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm">
        <p className="font-medium">Olá! 👋 Sou o Otto, o teu assistente Senvia OS.</p>
        <p className="text-muted-foreground mt-1">Como posso ajudar-te hoje?</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="h-auto py-1.5 px-3 text-xs rounded-full gap-1.5"
            onClick={() => onSelect(action.label)}
          >
            <action.icon className="w-3 h-3" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
