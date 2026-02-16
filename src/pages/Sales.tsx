import { useState, useMemo, useEffect } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { ShoppingBag, Search, TrendingUp, Package, CheckCircle, Plus } from "lucide-react";
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
import { EditSaleModal } from "@/components/sales/EditSaleModal";
import { TeamMemberFilter } from "@/components/dashboard/TeamMemberFilter";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatCurrency } from "@/lib/format";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import type { SaleWithDetails, SaleStatus } from "@/types/sales";
import { SALE_STATUS_LABELS, SALE_STATUS_COLORS, SALE_STATUSES } from "@/types/sales";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTelecomSaleMetrics } from "@/hooks/useTelecomSaleMetrics";

export default function Sales() {
  // Subscribe to realtime updates
  useSalesRealtime();
  const { profile, organization } = useAuth();
  const { data: sales, isLoading } = useSales();
  const isTelecom = organization?.niche === 'telecom';
  const { data: telecomMetrics } = useTelecomSaleMetrics();
  const [search, setSearch] = usePersistedState("sales-search-v1", "");
  const [statusFilter, setStatusFilter] = usePersistedState<SaleStatus | "all">("sales-status-v1", "all");
  const [dateRange, setDateRange] = usePersistedState<DateRange | undefined>("sales-date-range-v1", undefined);
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<SaleWithDetails | null>(null);
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);

  // Reactively open sale details when pendingSaleId matches a sale in cache
  useEffect(() => {
    if (pendingSaleId && sales) {
      const sale = sales.find(s => s.id === pendingSaleId);
      if (sale) {
        setSelectedSale(sale);
        setPendingSaleId(null);
      }
    }
  }, [sales, pendingSaleId]);

  // Sync selectedSale with fresh data from React Query cache
  useEffect(() => {
    if (selectedSale && sales) {
      const fresh = sales.find(s => s.id === selectedSale.id);
      if (fresh && fresh !== selectedSale) {
        setSelectedSale(fresh);
      }
    }
  }, [sales]);
  const filteredSales = useMemo(() => {
    if (!sales) return [];
    
    return sales.filter((sale) => {
      const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
      
      const matchesDate = (() => {
        if (!dateRange?.from) return true;
        const saleDate = parseISO(sale.sale_date);
        if (saleDate < startOfDay(dateRange.from)) return false;
        if (dateRange.to && saleDate > endOfDay(dateRange.to)) return false;
        return true;
      })();

      if (!search.trim()) {
        return matchesStatus && matchesDate;
      }
      
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        sale.lead?.name?.toLowerCase().includes(searchLower) ||
        sale.lead?.email?.toLowerCase().includes(searchLower) ||
        sale.client?.name?.toLowerCase().includes(searchLower) ||
        sale.client?.code?.toLowerCase().includes(searchLower) ||
        sale.code?.toLowerCase().includes(searchLower) ||
        sale.notes?.toLowerCase().includes(searchLower);
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [sales, search, statusFilter, dateRange]);

  // Summary stats
  const stats = useMemo(() => {
    if (!filteredSales.length) return { total: 0, totalValue: 0, delivered: 0, deliveredValue: 0, inProgress: 0 };
    
    const delivered = filteredSales.filter(s => s.status === 'delivered');
    const inProgress = filteredSales.filter(s => s.status === 'in_progress');
    
    return {
      total: filteredSales.length,
      totalValue: filteredSales.reduce((acc, s) => acc + (s.total_value || 0), 0),
      delivered: delivered.length,
      deliveredValue: delivered.reduce((acc, s) => acc + (s.total_value || 0), 0),
      inProgress: inProgress.length,
    };
  }, [filteredSales]);

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
      <div className="p-4 md:p-6 grid grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Vendas</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalValue)}</p>
            {isTelecom && telecomMetrics && (
              <p className="text-xs text-muted-foreground mt-1">
                {telecomMetrics.totalMWh.toFixed(1)} MWh · {telecomMetrics.totalKWp.toFixed(1)} kWp
              </p>
            )}
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
            {isTelecom && telecomMetrics && (
              <p className="text-xs text-muted-foreground mt-1">
                {telecomMetrics.deliveredMWh.toFixed(1)} MWh · {telecomMetrics.deliveredKWp.toFixed(1)} kWp
              </p>
            )}
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
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, empresa ou código..."
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
        <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full sm:w-auto" />
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
          onEdit={(sale) => {
            setSelectedSale(null);
            setSaleToEdit(sale);
          }}
        />

        {/* Edit Sale Modal */}
        {saleToEdit && (
          <EditSaleModal
            sale={saleToEdit}
            open={!!saleToEdit}
            onOpenChange={(open) => !open && setSaleToEdit(null)}
          />
        )}

        {/* Create Sale Modal */}
        <CreateSaleModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSaleCreated={(saleId) => {
            setShowCreateModal(false);
            setPendingSaleId(saleId);
          }}
        />
      </div>
    </AppLayout>
  );
}
