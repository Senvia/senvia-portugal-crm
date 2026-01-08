import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ResponsiveKanban } from "@/components/leads/ResponsiveKanban";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads, useLeadStats, useUpdateLeadStatus, useDeleteLead, useUpdateLead } from "@/hooks/useLeads";
import { Users, TrendingUp, Euro, UserPlus, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Lead } from "@/types";
import { LeadStatus, LeadTemperature } from "@/types";

export default function Dashboard() {
  const { profile, organization } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const stats = useLeadStats();
  const updateStatus = useUpdateLeadStatus();
  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync selectedLead with leads data after updates
  useEffect(() => {
    if (selectedLead && leads) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads]);

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    updateStatus.mutate({ leadId, status: newStatus });
  };

  const handleTemperatureChange = (leadId: string, temperature: LeadTemperature) => {
    updateLead.mutate({ leadId, updates: { temperature } });
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleDelete = (leadId: string) => {
    deleteLead.mutate(leadId);
  };

  const handleUpdate = (leadId: string, updates: Partial<Lead>) => {
    updateLead.mutate({ leadId, updates });
  };

  const greeting = profile?.full_name 
    ? `Olá, ${profile.full_name.split(' ')[0]}` 
    : 'Olá';

  return (
    <AppLayout 
      userName={profile?.full_name} 
      organizationName={organization?.name}
    >
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao painel de controlo da {organization?.name || 'sua organização'}.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Leads Totais" value={stats.total.toString()} icon={<Users className="h-6 w-6 text-primary" />} trend={{ value: 12, isPositive: true }} />
          <MetricCard title="Novos Leads" value={stats.new.toString()} icon={<UserPlus className="h-6 w-6 text-primary" />} />
          <MetricCard title="Taxa de Conversão" value={`${stats.conversionRate}%`} icon={<TrendingUp className="h-6 w-6 text-success" />} trend={{ value: 5, isPositive: true }} />
          <MetricCard title="Valor em Pipeline" value={formatCurrency(stats.pipelineValue)} icon={<Euro className="h-6 w-6 text-warning" />} />
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Gestão de Leads</h2>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : leads.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Sem leads por agora</p>
              <p className="text-sm">Os novos leads aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            <ResponsiveKanban leads={leads} onStatusChange={handleStatusChange} onTemperatureChange={handleTemperatureChange} onViewDetails={handleViewDetails} onDelete={handleDelete} />
          )}
        </div>

        <LeadDetailsModal lead={selectedLead} open={isModalOpen} onOpenChange={setIsModalOpen} onStatusChange={handleStatusChange} onDelete={handleDelete} onUpdate={handleUpdate} />
      </div>
    </AppLayout>
  );
}
