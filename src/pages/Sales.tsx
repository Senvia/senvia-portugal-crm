import { useState, useMemo } from "react";
import { ShoppingBag, Search, TrendingUp, Package, CheckCircle, Clock, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSales } from "@/hooks/useSales";
import { useSalesRealtime } from "@/hooks/useRealtimeSubscription";
import { SaleDetailsModal } from "@/components/sales/SaleDetailsModal";
import { CreateSaleModal } from "@/components/sales/CreateSaleModal";
import { TeamMemberFilter } from "@/components/dashboard/TeamMemberFilter";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { SaleWithDetails, SaleStatus } from "@/types/sales";
import { SALE_STATUS_LABELS, SALE_STATUS_COLORS, SALE_STATUSES } from "@/types/sales";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

export default function Sales() {
  // Subscribe to realtime updates
  useSalesRealtime();
  const { profile, organization } = useAuth();
  const { data: sales, isLoading } = useSales();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "all">("all");
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    
    return sales.filter((sale) => {
      const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
      
      // Se não há termo de pesquisa, inclui todas as vendas que correspondem ao status
      if (!search.trim()) {
        return matchesStatus;
      }
      
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        sale.lead?.name?.toLowerCase().includes(searchLower) ||
        sale.lead?.email?.toLowerCase().includes(searchLower) ||
        sale.client?.name?.toLowerCase().includes(searchLower) ||
        sale.client?.code?.toLowerCase().includes(searchLower) ||
        sale.code?.toLowerCase().includes(searchLower) ||
        sale.notes?.toLowerCase().includes(searchLower);
      
      return matchesSearch && matchesStatus;
    });
  }, [sales, search, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    if (!sales) return { total: 0, totalValue: 0, delivered: 0, deliveredValue: 0, pending: 0, inProgress: 0 };
    
    const delivered = sales.filter(s => s.status === 'delivered');
    const pending = sales.filter(s => s.status === 'pending');
    const inProgress = sales.filter(s => s.status === 'in_progress');
    
    return {
      total: sales.length,
      totalValue: sales.reduce((acc, s) => acc + (s.total_value || 0), 0),
      delivered: delivered.length,
      deliveredValue: delivered.reduce((acc, s) => acc + (s.total_value || 0), 0),
      pending: pending.length,
      inProgress: inProgress.length,
    };
  }, [sales]);

  return (
    <AppLayout userName={profile?.full_name} organizationName={organization?.name}>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header */}
      <div className="p-4 md:p-6 border-b border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Vendas</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Gestão de vendas e entregas.</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Nova Venda</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Vendas</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalValue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Entregues</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.deliveredValue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Em Progresso</span>
            </div>
            <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar vendas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/50 border-border/50"
          />
        </div>
        <TeamMemberFilter className="w-full sm:w-[180px]" />
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as SaleStatus | "all")}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card/50 border-border/50">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {SALE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {SALE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sales List */}
      <div className="flex-1 px-4 md:px-6 pb-24 md:pb-6 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Nenhuma venda encontrada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search || statusFilter !== "all" 
                ? "Tente ajustar os filtros de pesquisa."
                : "Crie a sua primeira venda ou aceite uma proposta."}
            </p>
          </div>
        ) : (
          filteredSales.map((sale) => (
            <Card 
              key={sale.id} 
              className="bg-card/50 border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => setSelectedSale(sale)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={`${SALE_STATUS_COLORS[sale.status]} text-xs`}
                      >
                        {SALE_STATUS_LABELS[sale.status]}
                      </Badge>
                      {sale.code && (
                        <span className="text-xs font-medium text-primary">{sale.code}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(sale.created_at), "d MMM yyyy", { locale: pt })}
                      </span>
                    </div>
                    <p className="font-medium truncate">
                      {sale.client?.name || sale.lead?.name || "Sem identificação"}
                    </p>
                    {sale.notes && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {sale.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold">{formatCurrency(sale.total_value)}</p>
                    {sale.proposal && (
                      <p className="text-xs text-muted-foreground">Via proposta</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

        {/* Sale Details Modal */}
        <SaleDetailsModal
          sale={selectedSale}
          open={!!selectedSale}
          onOpenChange={(open) => !open && setSelectedSale(null)}
        />

        {/* Create Sale Modal */}
        <CreateSaleModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      </div>
    </AppLayout>
  );
}
