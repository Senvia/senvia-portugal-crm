import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Clock, CalendarDays, ArrowRight, CreditCard, FileText } from "lucide-react";
import { useFinanceStats } from "@/hooks/useFinanceStats";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { PAYMENT_METHOD_LABELS } from "@/types/sales";

export default function Finance() {
  const { stats, isLoading } = useFinanceStats();
  const navigate = useNavigate();

  const chartData = stats.cashflowTrend.map(point => ({
    ...point,
    dateLabel: format(parseISO(point.date), 'dd MMM', { locale: pt }),
  }));

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Financeiro</h1>
            <p className="text-sm text-muted-foreground">
              Visão geral das finanças da sua empresa
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Faturado</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(stats.totalBilled)}</div>
              )}
              <p className="text-xs text-muted-foreground">Histórico total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recebido Este Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.receivedThisMonth)}</div>
              )}
              <p className="text-xs text-muted-foreground">Pagamentos confirmados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalPending)}</div>
              )}
              <p className="text-xs text-muted-foreground">A receber</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Vencer (7 dias)</CardTitle>
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.dueSoon)}</div>
              )}
              <p className="text-xs text-muted-foreground">{stats.dueSoonCount} pagamento(s)</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo de Caixa (últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
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
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="received"
                    name="Recebido"
                    stroke="hsl(var(--chart-1))"
                    fillOpacity={1}
                    fill="url(#colorReceived)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="scheduled"
                    name="Agendado"
                    stroke="hsl(var(--chart-2))"
                    fillOpacity={1}
                    fill="url(#colorScheduled)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Próximos Recebimentos</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={() => navigate('/financeiro/pagamentos')}
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : stats.dueSoonPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem pagamentos agendados para os próximos 7 dias
              </p>
            ) : (
              <div className="space-y-3">
                {stats.dueSoonPayments.slice(0, 5).map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                        <CalendarDays className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {payment.client_name || payment.lead_name || 'Cliente'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Venda #{payment.sale.code} · {formatDate(payment.payment_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        {payment.payment_method ? PAYMENT_METHOD_LABELS[payment.payment_method] : '--'}
                      </Badge>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid gap-4 grid-cols-2">
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/financeiro/pagamentos')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Pagamentos</h3>
                <p className="text-sm text-muted-foreground">Ver todos os pagamentos</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/financeiro/faturas')}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Faturas</h3>
                <p className="text-sm text-muted-foreground">Referências de faturas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
