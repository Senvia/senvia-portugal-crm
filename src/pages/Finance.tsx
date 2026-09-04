import { usePersistedState } from "@/hooks/usePersistedState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  TrendingUp,
  Clock,
  CalendarDays,
  TrendingDown,
  Scale,
  ExternalLink,
  AlertTriangle,
  Percent,
  Building2,
} from "lucide-react";
import { useFinanceStats } from "@/hooks/useFinanceStats";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { InvoicesContent } from "@/components/finance/InvoicesContent";
import InternalRequests from "@/pages/finance/InternalRequests";
import { BankAccountsTab } from "@/components/finance/BankAccountsTab";
import { TeamCommissionsTab } from "@/components/finance/TeamCommissionsTab";
import { CommissionAnalysisTab } from "@/components/finance/CommissionAnalysisTab";
import { MinhasComissoesModal } from "@/components/finance/MinhasComissoesModal";
import { FinanceCardDetail, type FinanceDetailType } from "@/components/finance/FinanceCardDetail";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useMyCommissions } from "@/hooks/useSalesApproval";
import { useTeamCommissionTotal } from "@/hooks/useCommercialCommissions";
import { RenewalAlertsWidget } from "@/components/finance/RenewalAlertsWidget";
import { ChargebacksTab } from "@/components/finance/ChargebacksTab";
import { hasPerfect2GetherAccess } from "@/lib/perfect2gether";
import { usePermissions } from "@/hooks/usePermissions";

export default function Finance() {
  const { organization, organizations } = useAuth();
  const { isAdmin, isSuperAdmin } = usePermissions();
  const salesSettings = (organization?.sales_settings as { commissions_enabled?: boolean }) || {};
  const commissionsEnabled = !!salesSettings.commissions_enabled;
  const canViewCommissionAnalysis = hasPerfect2GetherAccess({
    organizationId: organization?.id,
    memberships: organizations,
    isSuperAdmin,
  }) && isAdmin;
  // Chargebacks only exist for telecom, where a sale cancelled after install
  // claws its commission back.
  const isTelecom = organization?.niche === 'telecom';
  // Commissions moved to the standalone /comissoes page (available with the
  // Vendas module), so they are no longer tabs here.
  const validTabs = [
    "resumo",
    "contas",
    "faturas",
    ...(isTelecom ? ["chargebacks"] : []),
    "outros",
  ];
  const [dateRange, setDateRange] = usePersistedState<DateRange | undefined>("finance-daterange-v1", undefined);
  const [activeTab, setActiveTab] = usePersistedState("finance-tab-v1", "resumo");
  const [myCommissionsModalOpen, setMyCommissionsModalOpen] = useState(false);
  const [detailView, setDetailView] = useState<FinanceDetailType | null>(null);
  const { data: myCommissions } = useMyCommissions();

  // Commission cards respect the selected period (direct + recurring).
  const inPeriod = (dateStr?: string | null) => {
    if (!dateRange?.from) return true;
    if (!dateStr) return false;
    const d = parseISO(dateStr);
    if (d < startOfDay(dateRange.from)) return false;
    if (dateRange.to && d > endOfDay(dateRange.to)) return false;
    return true;
  };

  // Team commissions (admin Comissões card) — period-aware.
  const { data: teamCommission } = useTeamCommissionTotal(dateRange);
  const teamCommissionTotal = teamCommission?.total ?? 0;
  const teamSalesCount = teamCommission?.count ?? 0;
  // Telecom margin: what the operators paid, minus what the sellers took.
  const orgMarginTotal = teamCommission?.orgTotal ?? 0;
  const operatorGrossTotal = teamCommission?.grossTotal ?? 0;

  // Personal commission totals ("As Minhas Comissões") — filtered by period (sale date).
  // Telecom is earned on installation, so the period must be read off the
  // activation date — the same reference the team card uses, otherwise a sale
  // sold in one month and installed in the next lands on two different months.
  const myInPeriod = (myCommissions || []).filter((s) =>
    inPeriod(isTelecom ? (s.activation_date || s.sale_date) : s.sale_date),
  );
  const myPendingTotal = myInPeriod.reduce((sum, s) => {
    const isPending = s.status === 'pending' || s.status === 'in_progress';
    return isPending ? sum + (Number(s.comissao) || 0) : sum;
  }, 0);
  const myConfirmedTotal = myInPeriod.reduce((sum, s) => {
    const isConfirmed = s.status === 'delivered' || s.status === 'fulfilled';
    return isConfirmed ? sum + (Number(s.comissao) || 0) : sum;
  }, 0);

  useEffect(() => {
    if (organization && !validTabs.includes(activeTab)) {
      setActiveTab(validTabs[0]);
    }
  }, [organization, activeTab, setActiveTab, validTabs]);

  const { stats, isLoading, payments, allPayments } = useFinanceStats({ dateRange });

  const chartData = stats.cashflowTrend.map((point) => ({
    ...point,
    dateLabel: format(parseISO(point.date), "dd MMM", { locale: pt }),
  }));

  const hasFilters = dateRange?.from !== undefined;

  // Non-admin users only see their personal commissions card. The rest of the
  // Finance module (Resumo, Contas, Faturas, Outros, Comissões da equipa) is
  // restricted to admins.
  if (!isAdmin) {
    return (
      <div className="space-y-6 p-4 pb-20 md:p-6 md:pb-6 lg:p-8">
        <PageHeader icon={Wallet} title="Financeiro" subtitle="As tuas comissões." />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <Card
            className="group cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => setMyCommissionsModalOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">As Minhas Comissões</CardTitle>
              <div className="flex items-center gap-1">
                <Percent className="h-4 w-4 text-emerald-500" />
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-emerald-600 md:text-2xl">
                {formatCurrency(myConfirmedTotal)}
              </div>
              <p className="text-xs text-muted-foreground">
                Confirmadas
                {myPendingTotal > 0 && (
                  <span className="ml-1">· {formatCurrency(myPendingTotal)} pendentes</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <MinhasComissoesModal open={myCommissionsModalOpen} onOpenChange={setMyCommissionsModalOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-20 md:p-6 md:pb-6 lg:p-8">
      <PageHeader icon={Wallet} title="Financeiro" subtitle="Visão geral das finanças da sua empresa" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="faturas">Faturas</TabsTrigger>
          {isTelecom && <TabsTrigger value="chargebacks">Chargebacks</TabsTrigger>}
          <TabsTrigger value="outros">Outros</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-0 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="text-sm font-medium text-muted-foreground">Período:</span>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Todo o histórico"
                  className="w-full sm:w-auto"
                />
                {hasFilters && (
                  <span className="text-xs text-muted-foreground">(dados filtrados pelo período selecionado)</span>
                )}
              </div>
            </CardContent>
          </Card>

          {detailView ? (
            <FinanceCardDetail
              type={detailView}
              dateRange={dateRange}
              payments={payments}
              allPayments={allPayments}
              dueSoonPayments={stats.dueSoonPayments}
              onBack={() => setDetailView(null)}
            />
          ) : (
            <>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
            <Card
              className="group cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setDetailView("faturado")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Faturado</CardTitle>
                <div className="flex items-center gap-1">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-xl font-bold md:text-2xl">{formatCurrency(stats.totalBilled)}</div>
                )}
                <p className="text-xs text-muted-foreground">{hasFilters ? "No período" : "Histórico total"}</p>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setDetailView("received")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recebido</CardTitle>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-xl font-bold text-emerald-600 md:text-2xl">{formatCurrency(stats.totalReceived)}</div>
                )}
                <p className="text-xs text-muted-foreground">{hasFilters ? "No período" : "Total recebido"}</p>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setDetailView("pending")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendente</CardTitle>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-xl font-bold text-amber-600 md:text-2xl">{formatCurrency(stats.totalPending)}</div>
                )}
                <p className="text-xs text-muted-foreground">Total por receber</p>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setDetailView("overdue")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-xl font-bold text-orange-600 md:text-2xl">{formatCurrency(stats.totalOverdue)}</div>
                )}
                <p className="text-xs text-muted-foreground">{stats.overdueCount} pagamento(s)</p>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setDetailView("expenses")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-xl font-bold text-destructive md:text-2xl">{formatCurrency(stats.totalExpenses)}</div>
                )}
                <p className="text-xs text-muted-foreground">{hasFilters ? "No período" : "Total"}</p>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setDetailView("balance")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balanço</CardTitle>
                <div className="flex items-center gap-1">
                  <Scale className="h-4 w-4 text-primary" />
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className={`text-xl font-bold md:text-2xl ${stats.balance >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {formatCurrency(stats.balance)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Recebido - Despesas</p>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setDetailView("dueSoon")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Vencer (7 dias)</CardTitle>
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-xl font-bold text-blue-600 md:text-2xl">{formatCurrency(stats.dueSoon)}</div>
                )}
                <p className="text-xs text-muted-foreground">{stats.dueSoonCount} pagamento(s)</p>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setDetailView("myCommissions")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">As Minhas Comissões</CardTitle>
                <div className="flex items-center gap-1">
                  <Percent className="h-4 w-4 text-emerald-500" />
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600 md:text-2xl">
                  {formatCurrency(myConfirmedTotal)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Confirmadas
                  {myPendingTotal > 0 && (
                    <span className="ml-1">· {formatCurrency(myPendingTotal)} pendentes</span>
                  )}
                </p>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card
                className="group cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => setDetailView("commissions")}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Comissões</CardTitle>
                  <div className="flex items-center gap-1">
                    <Percent className="h-4 w-4 text-primary" />
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-primary md:text-2xl">
                    {formatCurrency(teamCommissionTotal)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {teamSalesCount > 0
                      ? `${teamSalesCount} venda(s) ${hasFilters ? "no período" : "no total"}`
                      : "Equipa"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* The operator's gross belongs here and nowhere else: this is the
                only place the margin the organization keeps makes sense. */}
            {isAdmin && isTelecom && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor da Organização</CardTitle>
                  <Building2 className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-amber-600 md:text-2xl">
                    {formatCurrency(orgMarginTotal)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Operadoras pagam {formatCurrency(operatorGrossTotal)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Fluxo de Caixa {hasFilters ? "(período selecionado)" : "(últimos 30 dias)"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="h-[180px] sm:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="dateLabel"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `€${value}`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => label}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="received"
                        name="Recebido"
                        stroke="#10b981"
                        fillOpacity={1}
                        fill="url(#colorReceived)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="scheduled"
                        name="Agendado"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorScheduled)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="overdue"
                        name="Atrasados"
                        stroke="#f97316"
                        fillOpacity={1}
                        fill="url(#colorOverdue)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Despesas"
                        stroke="#ef4444"
                        fillOpacity={0.3}
                        fill="#ef4444"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <RenewalAlertsWidget />
          </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="contas" className="mt-0">
          <BankAccountsTab />
        </TabsContent>

        <TabsContent value="faturas" className="mt-0">
          <InvoicesContent />
        </TabsContent>

        {isTelecom && (
          <TabsContent value="chargebacks" className="mt-0">
            <ChargebacksTab />
          </TabsContent>
        )}

        <TabsContent value="outros" className="mt-0">
          <InternalRequests />
        </TabsContent>

      </Tabs>
    </div>
  );
}
