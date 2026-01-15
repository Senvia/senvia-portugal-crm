import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Users, Crown, UserMinus, Euro } from "lucide-react";
import { useClients, useClientStats, useDeleteClient } from "@/hooks/useClients";
import { useClientLabels } from "@/hooks/useClientLabels";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { EditClientModal } from "@/components/clients/EditClientModal";
import { ClientDetailsDrawer } from "@/components/clients/ClientDetailsDrawer";
import type { CrmClient } from "@/types/clients";
import { formatCurrency } from "@/lib/format";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);

  const { data: clients, isLoading } = useClients();
  const { stats } = useClientStats();
  const deleteClient = useDeleteClient();
  const labels = useClientLabels();

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!search.trim()) return clients;

    const searchLower = search.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phone?.includes(search) ||
        client.company?.toLowerCase().includes(searchLower) ||
        client.nif?.includes(search)
    );
  }, [clients, search]);

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

  return (
    <AppLayout>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

          <Card>
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
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Pesquisar por nome, email, telefone, empresa ou NIF...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

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
    </AppLayout>
  );
}
