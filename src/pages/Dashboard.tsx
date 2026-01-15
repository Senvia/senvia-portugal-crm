import { AppLayout } from "@/components/layout/AppLayout";
import { SalesSection } from "@/components/dashboard/SalesSection";
import { LeadsSection } from "@/components/dashboard/LeadsSection";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { profile, organization } = useAuth();
  const stats = useDashboardStats();

  const greeting = profile?.full_name 
    ? `Olá, ${profile.full_name.split(' ')[0]}` 
    : 'Olá';

  return (
    <AppLayout 
      userName={profile?.full_name} 
      organizationName={organization?.name}
    >
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">{greeting}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Bem-vindo ao painel de controlo da {organization?.name || 'sua organização'}.
          </p>
        </div>

        {stats.isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <SalesSection
              deliveredSales={stats.deliveredSales}
              activeSales={stats.activeSales}
              conversionRate={stats.conversionRate}
              openProposals={stats.openProposals}
              acceptedProposals={stats.acceptedProposals}
            />

            <LeadsSection
              totalLeads={stats.totalLeads}
              websiteLeads={stats.websiteLeads}
              socialLeads={stats.socialLeads}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
