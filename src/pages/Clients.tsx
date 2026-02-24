import { useState, useMemo, useEffect } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Users, Crown, UserMinus, Euro, Shield, Zap } from "lucide-react";
import { useClients, useClientStats, useDeleteClient } from "@/hooks/useClients";
import { useClientLabels } from "@/hooks/useClientLabels";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { EditClientModal } from "@/components/clients/EditClientModal";
import { ClientDetailsDrawer } from "@/components/clients/ClientDetailsDrawer";
import { ClientFilters, defaultFilters, type ClientFiltersState } from "@/components/clients/ClientFilters";
import { BulkActionsBar } from "@/components/shared/BulkActionsBar";
import { AssignTeamMemberModal } from "@/components/shared/AssignTeamMemberModal";
import type { CrmClient } from "@/types/clients";
import { formatCurrency } from "@/lib/format";
import { mapClientsForExport, exportToCsv, exportToExcel } from "@/lib/export";
import { toast } from "sonner";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";

export default function Clients() {
  const { profile, organization } = useAuth();
  const [search, setSearch] = usePersistedState("clients-search-v1", "");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [filters, setFilters] = usePersistedState<ClientFiltersState>("clients-filters-v1", defaultFilters);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const { data: clients, isLoading } = useClients();
  const { stats } = useClientStats();
  const deleteClient = useDeleteClient();
  const labels = useClientLabels();

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    
    return clients.filter((client) => {
      if (search.trim()) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          client.name.toLowerCase().includes(searchLower) ||
          client.email?.toLowerCase().includes(searchLower) ||
          client.phone?.includes(search) ||
          client.company?.toLowerCase().includes(searchLower) ||
          client.code?.toLowerCase().includes(searchLower) ||
          client.nif?.includes(search);
        
        if (!matchesSearch) return false;
      }

      if (filters.status !== 'all' && client.status !== filters.status) {
        return false;
      }

      if (filters.source !== 'all' && client.source !== filters.source) {
        return false;
      }

      if (filters.dateFrom || filters.dateTo) {
        const clientDate = parseISO(client.created_at);
        const from = filters.dateFrom ? startOfDay(filters.dateFrom) : new Date(0);
        const to = filters.dateTo ? endOfDay(filters.dateTo) : new Date(2100, 11, 31);
        
        if (!isWithinInterval(clientDate, { start: from, end: to })) {
          return false;
        }
      }

      return true;
    });
  }, [clients, search, filters]);

  const handleEdit = (client: CrmClient) => {
    setSelectedClient(client);
    setShowDetailsDrawer(false);
    setShowEditModal(true);
  };

  const handleView = (client: CrmClient) => {
    setSelectedClient(client);
    setShowDetailsDrawer(true);
  };

  const handleDelete = (clientId: string) => {
    deleteClient.mutate(clientId);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [search, filters]);

  const handleAssignSuccess = () => {
    setSelectedIds([]);
    setShowAssignModal(false);
  };

  const handleExportCsv = () => {
    const selectedClients = filteredClients.filter(c => selectedIds.includes(c.id));
    const data = mapClientsForExport(selectedClients, organization?.niche === 'telecom');
    exportToCsv(data, `clientes_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success(`${selectedClients.length} clientes exportados para CSV`);
  };

  const handleExportExcel = () => {
    const selectedClients = filteredClients.filter(c => selectedIds.includes(c.id));
    const data = mapClientsForExport(selectedClients, organization?.niche === 'telecom');
    exportToExcel(data, `clientes_${format(new Date(), 'yyyy-MM-dd')}`);
    toast.success(`${selectedClients.length} clientes exportados para Excel`);
  };

  return (
    <>
      <SEO 
        title={`${labels.plural} | Senvia OS`}
        description={`Gestão de ${labels.plural.toLowerCase()} CRM`}
      />
      
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{labels.plural}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestão de {labels.plural.toLowerCase()} e relacionamento comercial
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {labels.new}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-2 gap-4 ${organization?.niche === 'telecom' ? 'md:grid-cols-4 lg:grid-cols-7' : 'md:grid-cols-5'}`}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">{labels.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">{labels.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <Crown className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.vip}</p>
                  <p className="text-xs text-muted-foreground">{labels.vip}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <UserMinus className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                  <p className="text-xs text-muted-foreground">{labels.inactive}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {organization?.niche === 'telecom' ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                      <Euro className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalComissao)}</p>
                      <p className="text-xs text-muted-foreground">Comissão</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalMwh.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">MWh</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                      <Zap className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalKwp.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">kWp</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="col-span-2 md:col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <Euro className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Pesquisar por nome, email, telefone, empresa ou NIF...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <ClientFilters 
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onAssignTeamMember={() => setShowAssignModal(true)}
          onExportCsv={handleExportCsv}
          onExportExcel={handleExportExcel}
          onClearSelection={() => setSelectedIds([])}
          entityLabel="clientes selecionados"
        />

        {/* Table */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <ClientsTable
            clients={filteredClients}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </div>

      {/* Modals */}
      <CreateClientModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      <EditClientModal
        client={selectedClient}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />

      <ClientDetailsDrawer
        client={selectedClient}
        open={showDetailsDrawer}
        onOpenChange={setShowDetailsDrawer}
        onEdit={handleEdit}
      />

      <AssignTeamMemberModal
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        selectedIds={selectedIds}
        entityType="clients"
        onSuccess={handleAssignSuccess}
      />
    </>
  );
}
