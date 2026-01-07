import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { KanbanBoard } from "@/components/leads/KanbanBoard";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lead, LeadStatus } from "@/types";
import { Plus, Search, Filter } from "lucide-react";

// Demo data
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
  {
    id: "6",
    organization_id: "org-1",
    name: "Carla Pereira",
    phone: "+351 967 890 123",
    email: "carla.pereira@email.pt",
    status: "lost",
    value: 7500,
    notes: "Optou por concorrência",
    gdpr_consent: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone.includes(searchQuery)
  );

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
    <AppLayout userName="Carlos" organizationName="Premium Services">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Leads</h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie todas as suas leads num só lugar
            </p>
          </div>
          <Button variant="senvia">
            <Plus className="h-4 w-4" />
            Nova Lead
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, email ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Kanban Board */}
        <KanbanBoard
          leads={filteredLeads}
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
