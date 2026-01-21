import { FileText, Calendar, ShoppingBag, Store, UserCheck, Mail } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useModules, EnabledModules } from "@/hooks/useModules";
import { Skeleton } from "@/components/ui/skeleton";

interface ModuleConfig {
  key: keyof EnabledModules;
  label: string;
  description: string;
  icon: React.ElementType;
}

const MODULES: ModuleConfig[] = [
  {
    key: 'clients',
    label: 'Clientes',
    description: 'Gestão de clientes e relacionamento comercial',
    icon: UserCheck,
  },
  {
    key: 'proposals',
    label: 'Propostas',
    description: 'Gestão de propostas e orçamentos comerciais',
    icon: FileText,
  },
  {
    key: 'sales',
    label: 'Vendas',
    description: 'Gestão de vendas e entregas',
    icon: ShoppingBag,
  },
  {
    key: 'calendar',
    label: 'Agenda',
    description: 'Agendamento de eventos, reuniões e lembretes',
    icon: Calendar,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Templates de email e campanhas de marketing',
    icon: Mail,
  },
  {
    key: 'ecommerce',
    label: 'E-commerce',
    description: 'Loja online com catálogo, pedidos, stock e clientes',
    icon: Store,
  },
];

export function ModulesTab() {
  const { modules, isLoading, updateModule, isUpdating } = useModules();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Módulos Ativos</h3>
        <p className="text-sm text-muted-foreground">
          Ative ou desative os módulos disponíveis na sua organização.
        </p>
      </div>

      <div className="space-y-4">
        {MODULES.map((module) => (
          <Card key={module.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <module.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{module.label}</CardTitle>
                    <CardDescription className="text-sm">
                      {module.description}
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  id={module.key}
                  checked={modules[module.key]}
                  onCheckedChange={(checked) => 
                    updateModule({ module: module.key, enabled: checked })
                  }
                  disabled={isUpdating}
                />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Os módulos desativados não aparecem no menu de navegação.
        Pode reativá-los a qualquer momento.
      </p>
    </div>
  );
}
