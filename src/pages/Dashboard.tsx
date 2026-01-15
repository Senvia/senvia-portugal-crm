import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { DynamicWidget } from "@/components/dashboard/DynamicWidget";
import { WidgetSelector } from "@/components/dashboard/WidgetSelector";
import { Button } from "@/components/ui/button";
import { Loader2, Settings2 } from "lucide-react";
import { WidgetType, NicheType } from "@/lib/dashboard-templates";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export default function Dashboard() {
  // Subscribe to realtime updates for dashboard data
  useRealtimeSubscription([
    { table: 'leads', queryKeys: [['leads'], ['dashboard-stats']] },
    { table: 'proposals', queryKeys: [['proposals'], ['dashboard-stats']] },
    { table: 'sales', queryKeys: [['sales'], ['dashboard-stats']] },
  ]);
  const { profile, organization } = useAuth();
  const { 
    visibleWidgets, 
    widgets,
    isLoading, 
    niche, 
    enabledModules,
    saveWidgets,
    resetToDefaults,
  } = useDashboardWidgets();
  
  const [isCustomizing, setIsCustomizing] = useState(false);

  const greeting = profile?.full_name 
    ? `Olá, ${profile.full_name.split(' ')[0]}` 
    : 'Olá';

  const handleSaveWidgets = (widgetsToSave: { type: WidgetType; position: number; is_visible: boolean }[]) => {
    saveWidgets.mutate(widgetsToSave);
  };

  const handleResetWidgets = () => {
    resetToDefaults.mutate();
  };

  return (
    <AppLayout 
      userName={profile?.full_name} 
      organizationName={organization?.name}
    >
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">{greeting}</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Bem-vindo ao painel de controlo da {organization?.name || 'sua organização'}.
            </p>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsCustomizing(true)}
            className="self-start sm:self-auto"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Personalizar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleWidgets.map((widget) => (
              <DynamicWidget
                key={widget.id || widget.widget_type}
                widgetType={widget.widget_type as WidgetType}
                niche={niche as NicheType}
              />
            ))}
          </div>
        )}

        {visibleWidgets.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum widget visível. Personalize o seu dashboard.
            </p>
            <Button onClick={() => setIsCustomizing(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Personalizar Dashboard
            </Button>
          </div>
        )}
      </div>

      <WidgetSelector
        open={isCustomizing}
        onOpenChange={setIsCustomizing}
        widgets={widgets}
        niche={niche as NicheType}
        enabledModules={enabledModules}
        onSave={handleSaveWidgets}
        onReset={handleResetWidgets}
      />
    </AppLayout>
  );
}
