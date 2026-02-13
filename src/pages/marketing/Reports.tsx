import { useState } from "react";
import { ArrowLeft, Mail, Eye, MousePointer, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmailStats } from "@/hooks/useEmailStats";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format } from "date-fns";

type Period = '7d' | '30d' | '90d';

export default function Reports() {
  const [period, setPeriod] = useState<Period>('30d');
  const { data: stats, isLoading } = useEmailStats(period);

  const metrics = stats ? [
    { label: "Total Enviados", value: stats.sent, icon: Mail, color: "text-foreground", sub: `${stats.total} totais` },
    { label: "Abertos", value: stats.opened, icon: Eye, color: "text-blue-500", sub: `${stats.openRate}% taxa de abertura` },
    { label: "Clicados", value: stats.clicked, icon: MousePointer, color: "text-purple-500", sub: `${stats.clickRate}% taxa de clique` },
    { label: "Erros", value: stats.failed, icon: AlertCircle, color: "text-destructive", sub: stats.total > 0 ? `${Math.round((stats.failed / stats.total) * 100)}% taxa de erro` : '0%' },
  ] : [];

  const chartData = stats?.daily.map(d => ({
    ...d,
    label: format(new Date(d.date), "dd/MM"),
  })) || [];

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/marketing">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
              <p className="text-muted-foreground text-sm">Métricas de envio de emails</p>
            </div>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList>
              <TabsTrigger value="7d">7 dias</TabsTrigger>
              <TabsTrigger value="30d">30 dias</TabsTrigger>
              <TabsTrigger value="90d">90 dias</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map(m => (
                <Card key={m.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <m.icon className={`h-4 w-4 ${m.color}`} />
                      <span className="text-sm text-muted-foreground">{m.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{m.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            {chartData.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Envios ao longo do tempo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 11 }} />
                          <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="sent" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Enviados" />
                          <Area type="monotone" dataKey="failed" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.2)" name="Erros" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Aberturas e Cliques</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 11 }} />
                          <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="opened" fill="hsl(210 80% 55%)" name="Abertos" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="clicked" fill="hsl(270 70% 55%)" name="Clicados" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {chartData.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sem dados de envio neste período</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
