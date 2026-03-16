import { usePersistedState } from "@/hooks/usePersistedState";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, TrendingUp, Clock, CalendarDays, ArrowRight, TrendingDown, Scale, ExternalLink, AlertTriangle } from "lucide-react";
import { useFinanceStats } from "@/hooks/useFinanceStats";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { PAYMENT_METHOD_LABELS } from "@/types/sales";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { InvoicesContent } from "@/components/finance/InvoicesContent";
import InternalRequests from "@/pages/finance/InternalRequests";
import { BankAccountsTab } from "@/components/finance/BankAccountsTab";
import { CommissionsTab } from "@/components/finance/CommissionsTab";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Percent } from "lucide-react";
import { useSalesCommissions } from "@/hooks/useSalesCommissions";
import { CommissionsPayableModal } from "@/components/finance/CommissionsPayableModal";
import { RenewalAlertsWidget } from "@/components/finance/RenewalAlertsWidget";

export default function Finance() {
...
                  <p className="text-xs text-muted-foreground">Saldo global por receber</p>
                </CardContent>
              </Card>
...
            <CommissionsPayableModal open={commissionsModalOpen} onOpenChange={setCommissionsModalOpen} />
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
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
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
                  )}
                </CardContent>
              </Card>

              <RenewalAlertsWidget />
            </div>

          </TabsContent>

          <TabsContent value="contas" className="mt-0">
            <BankAccountsTab />
          </TabsContent>

          <TabsContent value="faturas" className="mt-0">
            <InvoicesContent />
          </TabsContent>

          <TabsContent value="outros" className="mt-0">
            <InternalRequests />
          </TabsContent>

          {isTelecom && (
            <TabsContent value="comissoes" className="mt-0">
              <CommissionsTab />
            </TabsContent>
          )}
        </Tabs>
    </div>
  );
}
