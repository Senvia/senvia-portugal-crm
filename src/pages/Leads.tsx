import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ResponsiveKanban } from "@/components/leads/ResponsiveKanban";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { AddLeadModal } from "@/components/leads/AddLeadModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads, useUpdateLeadStatus, useDeleteLead, useUpdateLead } from "@/hooks/useLeads";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Users, Loader2, CalendarIcon, X, Plus } from "lucide-react";
import { format, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { normalizeString, cn } from "@/lib/utils";
import type { Lead } from "@/types";
import { LeadStatus, LeadTemperature, KANBAN_COLUMNS, STATUS_LABELS } from "@/types";

export default function Leads() {
  const { profile, organization } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const updateStatus = useUpdateLeadStatus();
  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  // Keep selectedLead synchronized with updated data from query
  useEffect(() => {
    if (selectedLead && leads.length > 0) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads]);

  const toggleStatus = (status: LeadStatus) => {
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
      statusFilter.includes(lead.status);
    
    // 3. Filtro de data
    const leadDate = lead.created_at ? new Date(lead.created_at) : null;
    const matchesDate = 
      (!dateRange.from || (leadDate && leadDate >= dateRange.from)) &&
      (!dateRange.to || (leadDate && leadDate <= endOfDay(dateRange.to)));
    
    return matchesSearch && matchesStatus && matchesDate;
  });

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

            <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />

            {/* Status Filter Badges */}
            {KANBAN_COLUMNS.map((status) => (
              <Badge
                key={status}
                variant={statusFilter.includes(status) ? "default" : "outline"}
                className="cursor-pointer transition-colors hover:bg-primary/10 shrink-0 text-xs"
                onClick={() => toggleStatus(status)}
              >
                {STATUS_LABELS[status]}
              </Badge>
            ))}

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
          ) : (
            <ResponsiveKanban leads={filteredLeads} onStatusChange={handleStatusChange} onTemperatureChange={handleTemperatureChange} onViewDetails={handleViewDetails} onDelete={handleDelete} />
          )}
        </div>

        <LeadDetailsModal lead={selectedLead} open={isModalOpen} onOpenChange={setIsModalOpen} onStatusChange={handleStatusChange} onDelete={handleDelete} onUpdate={handleUpdate} />
        <AddLeadModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      </div>
    </AppLayout>
  );
}
