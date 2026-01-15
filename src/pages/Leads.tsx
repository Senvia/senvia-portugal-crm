import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ResponsiveKanban } from "@/components/leads/ResponsiveKanban";
import { LeadsTableView } from "@/components/leads/LeadsTableView";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { AddLeadModal } from "@/components/leads/AddLeadModal";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { CreateProposalModal } from "@/components/proposals/CreateProposalModal";
import { ProposalDetailsModal } from "@/components/proposals/ProposalDetailsModal";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { useAuth } from "@/contexts/AuthContext";
import { useProposals } from "@/hooks/useProposals";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import type { Proposal } from "@/types/proposals";
import type { CalendarEvent } from "@/types/calendar";
import { useLeads, useUpdateLeadStatus, useDeleteLead, useUpdateLead } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Loader2, CalendarIcon, X, Plus, LayoutGrid, List } from "lucide-react";
import { format, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { normalizeString, cn } from "@/lib/utils";
import type { Lead, LeadTemperature } from "@/types";

export default function Leads() {
  const { profile, organization } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const { data: proposals = [] } = useProposals();
  const { data: calendarEvents = [] } = useCalendarEvents();
  const { data: stages = [] } = usePipelineStages();
  const updateStatus = useUpdateLeadStatus();
  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isCreateProposalModalOpen, setIsCreateProposalModalOpen] = useState(false);
  const [isProposalDetailsModalOpen, setIsProposalDetailsModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isEventDetailsModalOpen, setIsEventDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [pendingLead, setPendingLead] = useState<Lead | null>(null);
  
  // New states for the chained client -> proposal flow
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [newlyCreatedClientId, setNewlyCreatedClientId] = useState<string | null>(null);
  const [isChainedFlow, setIsChainedFlow] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(() => {
    const saved = localStorage.getItem('leads-view-mode');
    return (saved === 'table' || saved === 'kanban') ? saved : 'kanban';
  });

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem('leads-view-mode', viewMode);
  }, [viewMode]);

  // Keep selectedLead synchronized with updated data from query
  useEffect(() => {
    if (selectedLead && leads.length > 0) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads]);

  const toggleStatus = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter([]);
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = searchQuery || statusFilter.length > 0 || dateRange.from || dateRange.to;

  const filteredLeads = leads.filter(lead => {
    // 1. Pesquisa accent-insensitive
    const query = normalizeString(searchQuery);
    const matchesSearch = query === "" || 
      normalizeString(lead.name).includes(query) ||
      normalizeString(lead.email).includes(query) ||
      lead.phone.includes(searchQuery);
    
    // 2. Filtro de status
    const matchesStatus = statusFilter.length === 0 || 
      statusFilter.includes(lead.status || '');
    
    // 3. Filtro de data
    const leadDate = lead.created_at ? new Date(lead.created_at) : null;
    const matchesDate = 
      (!dateRange.from || (leadDate && leadDate >= dateRange.from)) &&
      (!dateRange.to || (leadDate && leadDate <= endOfDay(dateRange.to)));
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Check if a stage is of a special type (scheduled or proposal-like)
  const isScheduledStage = (stageKey: string) => {
    const stage = stages.find(s => s.key === stageKey);
    // Check if the stage name contains keywords that indicate it's a scheduling stage
    const scheduledKeywords = ['agendado', 'scheduled', 'reunião', 'meeting', 'consulta'];
    return stage && scheduledKeywords.some(kw => stage.name.toLowerCase().includes(kw));
  };

  const isProposalStage = (stageKey: string) => {
    const stage = stages.find(s => s.key === stageKey);
    // Check if the stage name contains keywords that indicate it's a proposal stage
    const proposalKeywords = ['proposta', 'proposal', 'orçamento', 'quote'];
    return stage && proposalKeywords.some(kw => stage.name.toLowerCase().includes(kw));
  };

  const handleStatusChange = (leadId: string, newStatus: string) => {
    const lead = leads.find(l => l.id === leadId);
    
    // Intercept drops on scheduling stages -> open event modal (create or view existing)
    if (isScheduledStage(newStatus)) {
      // Check if lead already has a pending/active event
      const existingEvent = calendarEvents.find(
        e => e.lead_id === leadId && e.status !== 'cancelled' && e.status !== 'completed'
      );

      if (existingEvent) {
        // If the lead already has an event, we still want the drop action
        // to actually move the lead to the chosen stage.
        if (!lead || lead.status !== newStatus) {
          updateStatus.mutate({ leadId, status: newStatus });
        }

        // Open event details modal
        setSelectedEvent(existingEvent);
        setIsEventDetailsModalOpen(true);
      } else {
        // Open create event modal
        setPendingLead(lead || null);
        setIsCreateEventModalOpen(true);
      }
      return;
    }
    
    // Intercept drops on proposal stages -> open client modal first (then proposal)
    if (isProposalStage(newStatus)) {
      // Check if lead already has a proposal
      const existingProposal = proposals.find(p => p.lead_id === leadId);
      
      if (existingProposal) {
        // Open edit modal
        setSelectedProposal(existingProposal);
        setIsProposalDetailsModalOpen(true);
      } else {
        // NEW FLOW: Open create client modal first (pre-filled with lead data)
        setPendingLead(lead || null);
        setIsCreateClientModalOpen(true);
      }
      return;
    }
    
    // For other statuses, update normally
    updateStatus.mutate({ leadId, status: newStatus });
  };

  const handleEventCreated = () => {
    // Status já é atualizado automaticamente pelo useCreateEvent hook
    // Apenas limpar os estados locais
    setPendingLead(null);
    setSelectedEvent(null);
    setIsCreateEventModalOpen(false);
  };

  const handleEditEvent = () => {
    // Close details modal and open create/edit modal
    setIsEventDetailsModalOpen(false);
    setIsCreateEventModalOpen(true);
  };

  const handleProposalCreated = () => {
    if (pendingLead) {
      // Find the proposal stage key
      const proposalStage = stages.find(s => isProposalStage(s.key));
      if (proposalStage) {
        updateStatus.mutate({ leadId: pendingLead.id, status: proposalStage.key });
      }
    }
    setPendingLead(null);
    setNewlyCreatedClientId(null);
    setIsChainedFlow(false);
    setIsCreateProposalModalOpen(false);
  };

  // Handler for when client is created in the chained flow (Lead -> Client -> Proposal)
  const handleClientCreatedForProposal = (clientId: string) => {
    // Mark that we're in a chained flow (preserve pendingLead)
    setIsChainedFlow(true);
    // Close client modal
    setIsCreateClientModalOpen(false);
    // Store the new client ID
    setNewlyCreatedClientId(clientId);
    // Open proposal modal
    setIsCreateProposalModalOpen(true);
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

  // Helper to get badge style from stage color
  const getBadgeStyle = (hexColor: string, isActive: boolean) => {
    if (isActive) {
      return {
        backgroundColor: hexColor,
        color: '#fff',
        borderColor: hexColor,
      };
    }
    return {
      backgroundColor: 'transparent',
      color: hexColor,
      borderColor: `${hexColor}50`,
    };
  };

  return (
    <AppLayout userName={profile?.full_name} organizationName={organization?.name}>
      <div className="p-4 lg:p-8">
        <div className="mb-4 lg:mb-6 space-y-3 lg:space-y-4">
          {/* Linha 1: Título + Pesquisa */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Leads</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Gerencie os contactos da sua organização.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Pesquisar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 lg:h-10" />
              </div>
              
              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center border border-border rounded-lg p-1 bg-background">
                <Button 
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('kanban')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('table')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              <Button onClick={() => setIsAddModalOpen(true)} className="shrink-0 h-9 lg:h-10">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            </div>
          </div>

          {/* Linha 2: Filtros de Data + Status + Limpar - scrollable on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 shrink-0", dateRange.from && "border-primary")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  <span className="text-xs">{dateRange.from ? format(dateRange.from, "dd/MM", { locale: pt }) : "De"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                  className="pointer-events-auto"
                  locale={pt}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 shrink-0", dateRange.to && "border-primary")}>
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  <span className="text-xs">{dateRange.to ? format(dateRange.to, "dd/MM", { locale: pt }) : "Até"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                  className="pointer-events-auto"
                  locale={pt}
                />
              </PopoverContent>
            </Popover>

            <div className="h-4 w-px bg-border shrink-0 hidden md:block" />

            {/* Mobile View Mode Toggle */}
            <div className="flex sm:hidden items-center border border-border rounded-lg p-1 bg-background shrink-0">
              <Button 
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} 
                size="icon"
                className="h-6 w-6"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                size="icon"
                className="h-6 w-6"
                onClick={() => setViewMode('table')}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Mobile: Select dropdown for status filter */}
            <Select
              value={statusFilter.length === 1 ? statusFilter[0] : "all"}
              onValueChange={(value) => {
                if (value === "all") {
                  setStatusFilter([]);
                } else {
                  setStatusFilter([value]);
                }
              }}
            >
              <SelectTrigger className="w-full h-8 md:hidden shrink-0">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.key}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Desktop: Status Filter Badges */}
            <div className="hidden md:flex items-center gap-2">
              {stages.map((stage) => (
                <Badge
                  key={stage.id}
                  variant="outline"
                  className="cursor-pointer transition-colors hover:opacity-80 shrink-0 text-xs"
                  style={getBadgeStyle(stage.color, statusFilter.includes(stage.key))}
                  onClick={() => toggleStatus(stage.key)}
                >
                  {stage.name}
                </Badge>
              ))}
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-muted-foreground hover:text-foreground shrink-0">
                <X className="mr-1 h-3.5 w-3.5" />
                <span className="text-xs">Limpar</span>
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 lg:p-4">
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
          ) : viewMode === 'kanban' ? (
            <ResponsiveKanban leads={filteredLeads} onStatusChange={handleStatusChange} onTemperatureChange={handleTemperatureChange} onViewDetails={handleViewDetails} onDelete={handleDelete} />
          ) : (
            <LeadsTableView 
              leads={filteredLeads} 
              onStatusChange={handleStatusChange} 
              onTemperatureChange={handleTemperatureChange} 
              onViewDetails={handleViewDetails} 
              onDelete={handleDelete} 
            />
          )}
        </div>

        <LeadDetailsModal lead={selectedLead} open={isModalOpen} onOpenChange={setIsModalOpen} onStatusChange={handleStatusChange} onDelete={handleDelete} onUpdate={handleUpdate} />
        <AddLeadModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
        
        {/* Modal for viewing/editing existing event */}
        <EventDetailsModal
          open={isEventDetailsModalOpen}
          onOpenChange={(open) => {
            setIsEventDetailsModalOpen(open);
            if (!open) setSelectedEvent(null);
          }}
          event={selectedEvent}
          onEdit={handleEditEvent}
        />
        
        {/* Modal for creating event when dropping on 'scheduled' */}
        <CreateEventModal
          open={isCreateEventModalOpen}
          onOpenChange={(open) => {
            setIsCreateEventModalOpen(open);
            if (!open) {
              setPendingLead(null);
              setSelectedEvent(null);
            }
          }}
          selectedDate={new Date()}
          preselectedLeadId={pendingLead?.id || selectedEvent?.lead_id}
          event={selectedEvent}
          onSuccess={handleEventCreated}
        />
        
        {/* Modal for creating client when dropping on 'proposal' (first step) */}
        <CreateClientModal
          open={isCreateClientModalOpen}
          onOpenChange={(open) => {
            setIsCreateClientModalOpen(open);
            // Only clear pendingLead if NOT in chained flow
            if (!open && !isChainedFlow) {
              setPendingLead(null);
            }
          }}
          onCreated={handleClientCreatedForProposal}
          initialData={pendingLead ? {
            name: pendingLead.name,
            email: pendingLead.email,
            phone: pendingLead.phone,
            notes: pendingLead.notes || undefined,
            source: "lead",
            leadId: pendingLead.id,
          } : undefined}
        />
        
        {/* Modal for creating proposal when dropping on 'proposal' (second step) */}
        <CreateProposalModal
          open={isCreateProposalModalOpen}
          onOpenChange={(open) => {
            setIsCreateProposalModalOpen(open);
            if (!open) {
              setPendingLead(null);
              setNewlyCreatedClientId(null);
              setIsChainedFlow(false);
            }
          }}
          onSuccess={handleProposalCreated}
          preselectedClientId={newlyCreatedClientId}
          leadId={pendingLead?.id}
        />
        
        {/* Modal for editing existing proposal */}
        <ProposalDetailsModal
          proposal={selectedProposal}
          open={isProposalDetailsModalOpen && !!selectedProposal}
          onOpenChange={(open) => {
            setIsProposalDetailsModalOpen(open);
            if (!open) setSelectedProposal(null);
          }}
        />
      </div>
    </AppLayout>
  );
}
