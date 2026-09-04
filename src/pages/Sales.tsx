import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { usePersistedState } from "@/hooks/usePersistedState";
import { matchesSearch } from "@/lib/utils";
import { ShoppingBag, Search, TrendingUp, Package, CheckCircle, Plus, Zap, Download, Loader2, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommissionsPanel } from "@/components/sales/CommissionsPanel";
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
import { exportToExcel, mapPerfect2GetherSalesForExport } from "@/lib/export";
import { hasPerfect2GetherAccess } from "@/lib/perfect2gether";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import type { SaleWithDetails, SaleStatus, TelecomStatus } from "@/types/sales";
import {
  BILLING_PROVIDER_LABELS,
  BILLING_STATUS_COLORS,
  BILLING_STATUS_LABELS,
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  SALE_STATUSES,
  TELECOM_STATUSES,
  TELECOM_STATUS_LABELS,
  TELECOM_STATUS_COLORS,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_LABELS,
} from "@/types/sales";
import { RecurringSalesFilters } from "@/components/sales/RecurringSalesFilters";
import {
  DEFAULT_RECURRING_SALES_FILTERS,
  hasRecurringSalesFilter,
  matchesRecurringSalesFilters,
  type RecurringSalesFilters as RecurringSalesFilterState,
} from "@/components/sales/recurring-sales-filter-logic";
import {
  TELECOM_VIEW_LABELS,
  isTelecomViewKey,
  isTelecomViewPeriodScoped,
  matchesTelecomView,
  type TelecomViewKey,
} from "@/lib/telecom-sale-views";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTelecomSaleMetrics } from "@/hooks/useTelecomSaleMetrics";
import { useModules } from "@/hooks/useModules";
import { useOperators } from "@/hooks/useOperators";
import type { ServicosDetails } from "@/types/proposals";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Sales() {
  // Subscribe to realtime updates
  useSalesRealtime();
  const { profile, organization, organizations, isSuperAdmin } = useAuth();
  const { data: sales, isLoading } = useSales();
  const isTelecom = organization?.niche === 'telecom';
  const isPerfect2Gether = hasPerfect2GetherAccess({
    organizationId: organization?.id,
    memberships: organizations,
    isSuperAdmin,
  });
  const { modules } = useModules();
  const { data: telecomMetrics } = useTelecomSaleMetrics();
  const { data: operators = [] } = useOperators();
  const { isAdmin } = usePermissions();
const queryClient = useQueryClient();
const [search, setSearch] = usePersistedState("sales-search-v1", "");
  const [statusFilter, setStatusFilter] = usePersistedState<SaleStatus | "all">("sales-status-v1", "all");
  const [telecomStatusFilter, setTelecomStatusFilter] = usePersistedState<TelecomStatus | "all">("sales-telecom-status-v1", "all");
  const [typeFilter, setTypeFilter] = usePersistedState<'all' | 'energia' | 'servicos'>('sales-type-v1', 'all');
  const [operatorFilter, setOperatorFilter] = usePersistedState<string>('sales-operator-v1', 'all');
  const [dateRange, setDateRange] = usePersistedState<DateRange | undefined>("sales-date-range-v1", undefined);
  const [recurringFilters, setRecurringFilters] = usePersistedState<RecurringSalesFilterState>(
    "sales-recurring-filters-v1",
    DEFAULT_RECURRING_SALES_FILTERS,
  );
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [salesTab, setSalesTab] = useState<'vendas' | 'comissoes'>('vendas');
  const [saleToEdit, setSaleToEdit] = useState<SaleWithDetails | null>(null);
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  // Sale pending deletion — drives the confirmation dialog (admin only).
  const [saleToDelete, setSaleToDelete] = useState<SaleWithDetails | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // Filter arriving from a dashboard card (?telecom=ativos&from=…&to=…). Lives
  // in the URL, not in persisted state: it is a one-off drill-down, and coming
  // back to Vendas later should not still be filtered by last week's click.
  const telecomView: TelecomViewKey | null = isTelecomViewKey(searchParams.get("telecom"))
    ? (searchParams.get("telecom") as TelecomViewKey)
    : null;
  const telecomFrom = searchParams.get("from");
  const telecomTo = searchParams.get("to");

  // Delete sale mutation (admin only)
const deleteSale = useMutation({
  mutationFn: async (saleId: string) => {
    const { error } = await supabase.from("sales").delete().eq("id", saleId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    toast.success("Venda excluída com sucesso");
  },
  onError: (err) => {
    toast.error("Erro ao excluir venda: " + (err instanceof Error ? err.message : "Erro desconhecido"));
  },
});

// Deep-link: ?sale=<id> opens the sale modal directly
  useEffect(() => {
    const id = searchParams.get("sale");
    if (id) setPendingSaleId(id);
  }, [searchParams]);

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

  const recurringProducts = useMemo(() => {
    const productsById = new Map<string, { id: string; name: string }>();
    for (const sale of sales ?? []) {
      for (const product of sale.recurring_products ?? []) {
        productsById.set(product.id, product);
      }
    }
    return Array.from(productsById.values());
  }, [sales]);

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

    // Reference month for "próximo mês": the period the dashboard card was
    // showing when it was clicked, so both sides look at the same month.
    const telecomReference = telecomFrom ? parseISO(telecomFrom) : new Date();

    return sales.filter((sale) => {
      // Drill-down from the dashboard. Its own date window replaces the
      // page's date filter — except for "próximo mês", which is a forward
      // look and must not be cut down to the period being analysed.
      if (telecomView) {
        if (!matchesTelecomView(sale, telecomView, telecomReference)) return false;
        if (isTelecomViewPeriodScoped(telecomView) && telecomFrom && telecomTo) {
          if (!sale.sale_date) return false;
          const d = parseISO(sale.sale_date);
          if (d < startOfDay(parseISO(telecomFrom)) || d > endOfDay(parseISO(telecomTo))) return false;
        }
      }

      const matchesStatus = isTelecom
        ? (telecomStatusFilter === "all" || sale.telecom_status === telecomStatusFilter)
        : (statusFilter === "all" || sale.status === statusFilter);
      const matchesType = typeFilter === 'all' || sale.proposal_type === typeFilter;
      // The operator is read off the sale's own frozen lines, not the catalog:
      // a product can be moved to another operator after the sale was made.
      const matchesOperator = operatorFilter === 'all' || (() => {
        const details = (sale.servicos_details ?? {}) as ServicosDetails;
        return Object.values(details).some((d) => d?.operator_id === operatorFilter);
      })();
      const matchesRecurring = matchesRecurringSalesFilters(
        {
          hasRecurring: sale.has_recurring,
          recurrence: sale.recurrence ?? null,
          recurringProductIds: sale.recurring_product_ids ?? [],
        },
        recurringFilters,
      );

      const matchesDate = (() => {
        if (!dateRange?.from) return true;
        const referenceDate = isPerfect2Gether ? sale.activation_date || sale.sale_date : sale.sale_date;
        if (!referenceDate) return false;
        const parsedDate = parseISO(referenceDate);
        if (parsedDate < startOfDay(dateRange.from)) return false;
        if (dateRange.to && parsedDate > endOfDay(dateRange.to)) return false;
        return true;
      })();

      if (!search.trim()) {
        return matchesStatus && matchesType && matchesOperator && matchesDate && matchesRecurring;
      }

      const matchesSearchTerm = matchesSearch(
        search,
        sale.lead?.name,
        sale.lead?.email,
        sale.client?.name,
        sale.client?.code,
        sale.code,
        sale.notes,
      );

      return matchesSearchTerm && matchesStatus && matchesType && matchesOperator && matchesDate && matchesRecurring;
    });
  }, [sales, search, statusFilter, telecomStatusFilter, isTelecom, typeFilter, operatorFilter, dateRange, isPerfect2Gether, recurringFilters, telecomView, telecomFrom, telecomTo]);

  // Summary stats
  const stats = useMemo(() => {
    if (!filteredSales.length) return { total: 0, totalValue: 0, delivered: 0, deliveredValue: 0, inProgress: 0, fulfilled: 0, fulfilledValue: 0 };

    const delivered = filteredSales.filter(s => s.status === 'delivered');
    const inProgress = filteredSales.filter(s => s.status === 'in_progress');
    const fulfilled = filteredSales.filter(s => s.status === 'fulfilled');

    return {
      total: filteredSales.length,
      totalValue: filteredSales.reduce((acc, s) => acc + (s.total_value || 0), 0),
      delivered: delivered.length,
      deliveredValue: delivered.reduce((acc, s) => acc + (s.total_value || 0), 0),
      inProgress: inProgress.length,
      fulfilled: fulfilled.length,
      fulfilledValue: fulfilled.reduce((acc, s) => acc + (s.total_value || 0), 0),
    };
  }, [filteredSales]);

  const handleExportPerfect2Gether = async () => {
    if (!isPerfect2Gether) return;
    if (!dateRange?.from) {
      toast.error("Selecione o período por Data de Adjudicação antes de exportar.");
      return;
    }

    const exportSales = filteredSales.filter((sale) => !!sale.activation_date);
    if (exportSales.length === 0) {
      toast.error("Não existem vendas adjudicadas no período selecionado.");
      return;
    }

    setIsExporting(true);
    try {
      const proposalIds = Array.from(new Set(exportSales.map((sale) => sale.proposal_id).filter(Boolean))) as string[];
      const leadIds = Array.from(new Set(exportSales.map((sale) => sale.lead_id).filter(Boolean))) as string[];
      const consultantIds = Array.from(new Set(exportSales.flatMap((sale) => [sale.created_by, sale.lead?.assigned_to]).filter(Boolean))) as string[];
      const saleIds = exportSales.map((sale) => sale.id);

      const [proposalsResponse, cpesResponse, paymentsResponse, leadsResponse, consultantsResponse] = await Promise.all([
        proposalIds.length > 0
          ? supabase
              .from("proposals")
              .select("id, code, accepted_at, proposal_date, proposal_type, negotiation_type, kwp, margem, dbl, anos_contrato, comissao, total_value")
              .in("id", proposalIds)
          : Promise.resolve({ data: [], error: null }),
        proposalIds.length > 0
          ? supabase
              .from("proposal_cpes")
              .select("proposal_id, serial_number, consumo_anual, duracao_contrato, dbl, margem, comissao, contrato_inicio, contrato_fim")
              .in("proposal_id", proposalIds)
          : Promise.resolve({ data: [], error: null }),
        saleIds.length > 0
          ? supabase
              .from("sale_payments")
              .select("sale_id, amount, status")
              .in("sale_id", saleIds)
          : Promise.resolve({ data: [], error: null }),
        leadIds.length > 0
          ? supabase
              .from("leads")
              .select("id, source")
              .in("id", leadIds)
          : Promise.resolve({ data: [], error: null }),
        consultantIds.length > 0
          ? supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", consultantIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const firstError = [
        proposalsResponse.error,
        cpesResponse.error,
        paymentsResponse.error,
        leadsResponse.error,
        consultantsResponse.error,
      ].find(Boolean);

      if (firstError) throw firstError;

      const proposalsById = new Map((proposalsResponse.data || []).map((proposal) => [proposal.id, proposal]));
      const cpesByProposalId = new Map<string, Array<(typeof cpesResponse.data)[number]>>();
      for (const cpe of cpesResponse.data || []) {
        const current = cpesByProposalId.get(cpe.proposal_id) || [];
        current.push(cpe);
        cpesByProposalId.set(cpe.proposal_id, current);
      }

      const paymentsBySaleId = new Map<string, Array<(typeof paymentsResponse.data)[number]>>();
      for (const payment of paymentsResponse.data || []) {
        const current = paymentsBySaleId.get(payment.sale_id) || [];
        current.push(payment);
        paymentsBySaleId.set(payment.sale_id, current);
      }

      const consultantsById = new Map((consultantsResponse.data || []).map((profile) => [profile.id, profile.full_name || "Comercial"]));
      const leadSourcesById = new Map((leadsResponse.data || []).map((lead) => [lead.id, lead.source || ""]));

      const rows = mapPerfect2GetherSalesForExport(exportSales, {
        proposalsById,
        cpesByProposalId,
        paymentsBySaleId,
        consultantsById,
        leadSourcesById,
      });

      exportToExcel(rows, `perfect2gether-vendas-${format(dateRange.from, "yyyy-MM")}`);
      toast.success("Exportação Perfect2Gether concluída.");
    } catch (error) {
      console.error("Error exporting Perfect2Gether sales:", error);
      toast.error("Não foi possível exportar o ficheiro Perfect2Gether.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-background">
        {/* Header */}
      <div className="p-4 md:p-6 border-b border-border/50">
        <PageHeader
          icon={ShoppingBag}
          title="Vendas"
          subtitle="Gestão de vendas e entregas."
          className="mb-0"
          actions={
            <>
              {isPerfect2Gether && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPerfect2Gether}
                  disabled={isExporting}
                >
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  <span className="hidden sm:inline">Exportar Perfect2Gether</span>
                  <span className="sm:hidden">Exportar</span>
                </Button>
              )}
              <Button onClick={() => setShowCreateModal(true)} size="sm">
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Nova Venda</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </>
          }
        />
      </div>

      {/* Vendas / Comissões */}
      <div className="px-4 pt-4 md:px-6">
        <Tabs value={salesTab} onValueChange={(v) => setSalesTab(v as 'vendas' | 'comissoes')}>
          <TabsList>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {salesTab === 'comissoes' && <CommissionsPanel />}

      {salesTab === 'vendas' && (
      <>
      {/* Summary Cards */}
      <div className="p-4 md:p-6 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Vendas</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalValue)}</p>
            {isTelecom && modules.energy && telecomMetrics && (
              <p className="text-xs text-muted-foreground mt-1">
                {telecomMetrics.totalMWh.toFixed(1)} MWh · {telecomMetrics.totalKWp.toFixed(1)} kWp
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

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Entregues</span>
            </div>
            <p className="text-2xl font-bold text-purple-500">{stats.fulfilled}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.fulfilledValue)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Concluídas</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.deliveredValue)}</p>
            {isTelecom && modules.energy && telecomMetrics && (
              <p className="text-xs text-muted-foreground mt-1">
                {telecomMetrics.deliveredMWh.toFixed(1)} MWh · {telecomMetrics.deliveredKWp.toFixed(1)} kWp
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 pb-4 space-y-3">
        {/* Drill-down chip: says which dashboard card brought you here, and
            clears back to the full list. */}
        {telecomView && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="text-muted-foreground">A mostrar:</span>
            <span className="font-medium">{TELECOM_VIEW_LABELS[telecomView]}</span>
            {telecomFrom && telecomTo && isTelecomViewPeriodScoped(telecomView) && (
              <span className="text-xs text-muted-foreground">
                {format(parseISO(telecomFrom), "d MMM", { locale: pt })} – {format(parseISO(telecomTo), "d MMM yyyy", { locale: pt })}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 px-2 text-xs"
              onClick={() => setSearchParams({}, { replace: true })}
            >
              Limpar filtro
            </Button>
          </div>
        )}
        <div className="space-y-3">
        {/* Search gets its own row so it never fights the filter grid for
            width — that's what was squeezing every label down to "Todos
            as...". Everything below sits in a grid instead of a single flex
            row, so each control gets a real column instead of shrinking. */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, empresa ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/50 border-border/50"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <TeamMemberFilter className="w-full bg-card/50 border-border/50" />
        {/* Telecom filters by its own lifecycle, not the generic sale status —
            it is the only state that vertical uses. */}
        {isTelecom ? (
          <Select
            value={telecomStatusFilter}
            onValueChange={(val) => setTelecomStatusFilter(val as TelecomStatus | "all")}
          >
            <SelectTrigger className="w-full bg-card/50 border-border/50">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estados</SelectItem>
              {TELECOM_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TELECOM_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as SaleStatus | "all")}>
            <SelectTrigger className="w-full bg-card/50 border-border/50">
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
        )}
        {/* A sale can carry lines from more than one operator, so this keeps
            any sale with at least one line from the chosen one. */}
        {isTelecom && operators.length > 0 && (
          <Select value={operatorFilter} onValueChange={setOperatorFilter}>
            <SelectTrigger className="w-full bg-card/50 border-border/50">
              <SelectValue placeholder="Filtrar por operadora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as operadoras</SelectItem>
              {operators.map((op) => (
                <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full" />
        {isTelecom && modules.energy && (
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'energia' | 'servicos')}>
            <SelectTrigger className="w-full bg-card/50 border-border/50">
              <Zap className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="energia">Energia</SelectItem>
              <SelectItem value="servicos">Outros Serviços</SelectItem>
            </SelectContent>
          </Select>
        )}
        </div>
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">Vendas recorrentes</p>
          <RecurringSalesFilters
            filters={recurringFilters}
            products={recurringProducts}
            onChange={setRecurringFilters}
          />
        </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="flex-1 px-4 md:px-6 pb-nav-safe md:pb-6 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : filteredSales.length === 0 ? (
          (search || statusFilter !== "all" || telecomStatusFilter !== "all" || telecomView || hasRecurringSalesFilter(recurringFilters)) ? (
            <EmptyState icon={ShoppingBag} title="Nenhuma venda encontrada" description="Tenta ajustar os filtros de pesquisa." />
          ) : (
            <EmptyState
              icon={ShoppingBag}
              title="Ainda não tens vendas"
              description="Regista a tua primeira venda ou aceita uma proposta para começares a faturar."
            >
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registar primeira venda
              </Button>
            </EmptyState>
          )
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
                      {/* Telecom shows its own lifecycle; the generic status
                          is kept in sync behind it but never displayed here. */}
                      {isTelecom && sale.telecom_status ? (
                        <Badge
                          variant="outline"
                          className={`${TELECOM_STATUS_COLORS[sale.telecom_status as TelecomStatus]} text-xs`}
                        >
                          {TELECOM_STATUS_LABELS[sale.telecom_status as TelecomStatus]}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`${SALE_STATUS_COLORS[sale.status]} text-xs`}
                        >
                          {isTelecom ? 'Sem estado' : SALE_STATUS_LABELS[sale.status]}
                        </Badge>
                      )}
                      {isTelecom && modules.energy && (sale as any).proposal_type && (
                        <Badge 
                          variant="outline" 
                          className={(sale as any).proposal_type === 'energia' 
                            ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs' 
                            : 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30 text-xs'}
                        >
                          {(sale as any).proposal_type === 'energia' ? '⚡ Energia' : '🔧 Serviços'}
                        </Badge>
                      )}
                      {sale.recurrence && (
                        <>
                          <Badge
                            variant="outline"
                            className={`${SERVICE_STATUS_COLORS[sale.recurrence.service_status]} text-xs`}
                          >
                            Serviço: {SERVICE_STATUS_LABELS[sale.recurrence.service_status]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`${BILLING_STATUS_COLORS[sale.recurrence.billing_status]} text-xs`}
                          >
                            Cobrança: {BILLING_STATUS_LABELS[sale.recurrence.billing_status]}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {BILLING_PROVIDER_LABELS[sale.recurrence.billing_provider]}
                          </Badge>
                        </>
                      )}
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
                    {sale.recurrence && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(sale.recurrence.amount)}/mês
                      </p>
                    )}
                    {sale.proposal && (
                      <p className="text-xs text-muted-foreground">Via proposta</p>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSaleToDelete(sale);
                        }}
                        className="mt-2 rounded p-1 text-destructive/70 hover:bg-destructive/10 transition-colors"
                        title="Excluir venda"
                      >
                        <Trash2 className="h-3.5 w-3.5 mx-auto" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </>
      )}

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

        {/* Delete confirmation (admin only) */}
        <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
              <AlertDialogDescription>
                {saleToDelete && (
                  <>
                    Vais excluir a venda de{" "}
                    <span className="font-medium text-foreground">
                      {saleToDelete.client?.name || saleToDelete.lead?.name || "Sem identificação"}
                    </span>{" "}
                    ({formatCurrency(saleToDelete.total_value)}). Esta ação não pode ser desfeita.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (saleToDelete) deleteSale.mutate(saleToDelete.id);
                  setSaleToDelete(null);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
