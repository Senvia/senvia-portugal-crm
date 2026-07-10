import { useAuth } from "@/contexts/AuthContext";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { DynamicWidget } from "@/components/dashboard/DynamicWidget";
import { TeamMemberFilter } from "@/components/dashboard/TeamMemberFilter";
import { DashboardPeriodFilter } from "@/components/dashboard/DashboardPeriodFilter";
import { FidelizationAlertsWidget } from "@/components/dashboard/FidelizationAlertsWidget";
import { CalendarAlertsWidget } from "@/components/dashboard/CalendarAlertsWidget";
import { InboxAlertsWidget } from "@/components/dashboard/InboxAlertsWidget";
import { TasksWidget } from "@/components/dashboard/TasksWidget";
import { CommitmentPanel } from "@/components/dashboard/CommitmentPanel";
import { SalesPerformancePanel } from "@/components/dashboard/SalesPerformancePanel";
import { MetricsPanel } from "@/components/dashboard/MetricsPanel";
import { CommissionsWidget } from "@/components/dashboard/CommissionsWidget";
import { TeamPerformanceTable } from "@/components/dashboard/TeamPerformanceTable";
import { Loader2, Sparkles, LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Link } from "react-router-dom";
import { NicheType } from "@/lib/dashboard-templates";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useModules } from "@/hooks/useModules";
import { ActivationsPanel } from "@/components/dashboard/ActivationsPanel";
import { PaidTrafficCard } from "@/components/dashboard/PaidTrafficCard";
import { OttoDashboardSetup } from "@/components/otto/OttoDashboardSetup";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaidTrafficFilter } from "@/contexts/PaidTrafficFilterContext";
import { TRAFFIC_FILTER_OPTIONS, type TrafficFilterKey } from "@/lib/paid-traffic";
import { MousePointerClick } from "lucide-react";

export default function Dashboard() {
  useRealtimeSubscription([
    { table: 'leads', queryKeys: [['leads'], ['dashboard-stats']] },
    { table: 'proposals', queryKeys: [['proposals'], ['dashboard-stats']] },
    { table: 'sales', queryKeys: [['sales'], ['dashboard-stats']] },
  ]);
  const { profile, organization } = useAuth();
  const { modules } = useModules();
  const isTelecom = organization?.niche === 'telecom';
  const clientsModuleEnabled = modules.clients;
  const calendarModuleEnabled = modules.calendar !== false;
  const salesSettings = (organization?.sales_settings as any) || {};
  const commissionsEnabled = !!salesSettings.commissions_enabled;
  const {
    visibleWidgets,
    isLoading,
    niche,
  } = useDashboardWidgets();
  const { filterKey, setFilter } = usePaidTrafficFilter();

  const greeting = profile?.full_name 
    ? `Olá, ${profile.full_name.split(' ')[0]}` 
    : 'Olá';

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pb-2 pt-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b">
        <PageHeader
          icon={LayoutDashboard}
          title={greeting}
          subtitle={`Bem-vindo ao painel de controlo da ${organization?.name || 'sua organização'}.`}
          actions={
            <>
              <Link
                to="/novidades"
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">O que há de novo</span>
              </Link>
              <DashboardPeriodFilter />
              <Select value={filterKey} onValueChange={(v) => setFilter(v as TrafficFilterKey)}>
                <SelectTrigger className="h-9 w-[160px] sm:w-[180px] gap-1.5">
                  <MousePointerClick className="h-4 w-4 shrink-0 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRAFFIC_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TeamMemberFilter className="w-[150px] sm:w-[180px]" />
            </>
          }
        />
      </div>

      <OttoDashboardSetup />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {isTelecom && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Atividade Comercial</h2>
              <div className="space-y-4">
                <CommitmentPanel />
                <SalesPerformancePanel />
                <MetricsPanel />
                <ActivationsPanel />
              </div>
            </div>
          )}

          {(isTelecom && clientsModuleEnabled || calendarModuleEnabled || modules.inbox) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {isTelecom && clientsModuleEnabled && (
                <FidelizationAlertsWidget />
              )}
              {calendarModuleEnabled && (
                <CalendarAlertsWidget />
              )}
              {modules.inbox && <InboxAlertsWidget />}
              {modules.inbox && <TasksWidget />}
            </div>
          )}

          {commissionsEnabled && (
            <CommissionsWidget />
          )}

          {visibleWidgets.some(w => w.widget_type === 'team_performance_table') && (
            <TeamPerformanceTable />
          )}
          
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <PaidTrafficCard />
            {visibleWidgets.filter(w => w.widget_type !== 'team_performance_table').map((widget) => (
              <DynamicWidget
                key={widget.id || widget.widget_type}
                widgetType={widget.widget_type as any}
                niche={niche as NicheType}
              />
            ))}
          </div>
        </div>
      )}

      {visibleWidgets.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            Nenhum widget configurado para o seu perfil. Contacte o administrador para personalizar o dashboard em Definições &gt; Perfis.
          </p>
        </div>
      )}
    </div>
  );
}
