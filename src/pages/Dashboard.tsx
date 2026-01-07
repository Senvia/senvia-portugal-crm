import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { KanbanBoard } from "@/components/leads/KanbanBoard";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { Lead, LeadStatus } from "@/types";
import { formatCurrency } from "@/lib/format";
import { Users, TrendingUp, Euro, Target } from "lucide-react";

// Demo data - will be replaced with Supabase
const initialLeads: Lead[] = [
  {
    id: "1",
    organization_id: "org-1",
    name: "João Silva",
    phone: "+351 912 345 678",
    email: "joao.silva@email.pt",
    status: "new",
    value: 5000,
    source: "Landing Page",
    gdpr_consent: true,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2",
    organization_id: "org-1",
    name: "Maria Santos",
    phone: "+351 923 456 789",
    email: "maria.santos@email.pt",
    status: "conversation",
    value: 12000,
    source: "Referência",
    gdpr_consent: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "3",
    organization_id: "org-1",
    name: "António Costa",
    phone: "+351 934 567 890",
    email: "antonio.costa@email.pt",
    status: "scheduled",
    value: 8500,
    notes: "Reunião agendada para dia 15",
    gdpr_consent: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "4",
    organization_id: "org-1",
    name: "Ana Rodrigues",
    phone: "+351 945 678 901",
    email: "ana.rodrigues@email.pt",
    status: "sold",
    value: 15000,
    gdpr_consent: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "5",
    organization_id: "org-1",
    name: "Pedro Fernandes",
    phone: "+351 956 789 012",
    email: "pedro.fernandes@email.pt",
    status: "new",
    value: 3500,
    gdpr_consent: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
];

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const userName = "Carlos"; // Will come from auth

  // Calculate metrics
  const totalLeads = leads.length;
  const soldLeads = leads.filter(l => l.status === 'sold').length;
  const conversionRate = totalLeads > 0 ? Math.round((soldLeads / totalLeads) * 100) : 0;
  const pipelineValue = leads
    .filter(l => l.status !== 'lost' && l.status !== 'sold')
    .reduce((sum, l) => sum + (l.value || 0), 0);
  const soldValue = leads
    .filter(l => l.status === 'sold')
    .reduce((sum, l) => sum + (l.value || 0), 0);

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    setLeads(prev => 
      prev.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailsOpen(true);
  };

  const handleDelete = (leadId: string) => {
    setLeads(prev => prev.filter(lead => lead.id !== leadId));
  };

  return (
    <AppLayout userName={userName} organizationName="Premium Services">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Olá, {userName} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Bem-vindo à sua Área do Cliente
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Leads Totais"
            value={totalLeads}
            icon={<Users className="h-6 w-6 text-primary" />}
            trend={{ value: 12, isPositive: true }}
          />
          <MetricCard
            title="Taxa de Conversão"
            value={`${conversionRate}%`}
            icon={<TrendingUp className="h-6 w-6 text-primary" />}
            trend={{ value: 5, isPositive: true }}
          />
          <MetricCard
            title="Valor em Pipeline"
            value={formatCurrency(pipelineValue)}
            icon={<Target className="h-6 w-6 text-primary" />}
          />
          <MetricCard
            title="Vendas Fechadas"
            value={formatCurrency(soldValue)}
            icon={<Euro className="h-6 w-6 text-primary" />}
            trend={{ value: 18, isPositive: true }}
          />
        </div>

        {/* Kanban Section */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground">Pipeline de Vendas</h2>
          <p className="text-sm text-muted-foreground">
            Arraste os cartões para mover leads entre estados
          </p>
        </div>

        <KanbanBoard
          leads={leads}
          onStatusChange={handleStatusChange}
          onViewDetails={handleViewDetails}
          onDelete={handleDelete}
        />

        {/* Lead Details Modal */}
        <LeadDetailsModal
          lead={selectedLead}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </div>
    </AppLayout>
  );
}
