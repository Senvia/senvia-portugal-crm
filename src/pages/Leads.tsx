import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { KanbanBoard } from "@/components/leads/KanbanBoard";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads, useUpdateLeadStatus, useDeleteLead, useUpdateLead } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
import { Search, Users, Loader2 } from "lucide-react";
import type { Lead, LeadStatus } from "@/types";

export default function Leads() {
  const { profile, organization } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const updateStatus = useUpdateLeadStatus();
  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Keep selectedLead synchronized with updated data from query
  useEffect(() => {
    if (selectedLead && leads.length > 0) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads]);

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone.includes(searchQuery)
  );

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    updateStatus.mutate({ leadId, status: newStatus });
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

  return (
    <AppLayout userName={profile?.full_name} organizationName={organization?.name}>
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads</h1>
            <p className="text-muted-foreground">Gerencie os contactos da sua organização.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Pesquisar leads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredLeads.length === 0 && searchQuery ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum resultado encontrado</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Sem leads por agora</p>
            </div>
          ) : (
            <KanbanBoard leads={filteredLeads} onStatusChange={handleStatusChange} onViewDetails={handleViewDetails} onDelete={handleDelete} />
          )}
        </div>

        <LeadDetailsModal lead={selectedLead} open={isModalOpen} onOpenChange={setIsModalOpen} onStatusChange={handleStatusChange} onDelete={handleDelete} onUpdate={handleUpdate} />
      </div>
    </AppLayout>
  );
}
