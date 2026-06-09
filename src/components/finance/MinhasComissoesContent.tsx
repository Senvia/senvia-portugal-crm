import { useMemo, useState } from 'react';
import { format, startOfMonth, startOfDay, endOfDay, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wallet, Clock, CheckCircle2 } from 'lucide-react';
import { useMyCommissions } from '@/hooks/useSalesApproval';
import { formatCurrency } from '@/lib/format';

type StatusFilter = 'pending' | 'confirmed' | 'cancelled' | 'all';
type Bucket = 'confirmed' | 'pending' | 'cancelled';

interface CommissionSale {
  status: string;
  is_paid: boolean;
}

// Commission is only "confirmed" (earned/payable) when the sale is concluded
// (delivered/fulfilled) AND fully paid. Anything else (not concluded, or
// concluded but unpaid) is pending; cancelled is cancelled.
const bucketOf = (s: CommissionSale): Bucket => {
  if (s.status === 'cancelled') return 'cancelled';
  if ((s.status === 'delivered' || s.status === 'fulfilled') && s.is_paid) return 'confirmed';
  return 'pending';
};

const isConfirmed = (s: CommissionSale) => bucketOf(s) === 'confirmed';
const isPending = (s: CommissionSale) => bucketOf(s) === 'pending';
const isCancelled = (s: CommissionSale) => bucketOf(s) === 'cancelled';

function badgeMeta(s: CommissionSale): { label: string; className: string } {
  const b = bucketOf(s);
  if (b === 'confirmed') return { label: 'Confirmada', className: 'bg-green-500/10 text-green-700 dark:text-green-400' };
  if (b === 'cancelled') return { label: 'Anulada', className: 'bg-red-500/10 text-red-700 dark:text-red-400' };
  // pending: distinguish "concluded but awaiting payment" from "not concluded yet"
  const concluded = s.status === 'delivered' || s.status === 'fulfilled';
  return {
    label: concluded ? 'Aguarda pagamento' : 'Pendente',
    className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  };
}

export function MinhasComissoesContent({ dateRange }: { dateRange?: DateRange }) {
  const { data: allSales = [], isLoading } = useMyCommissions();
  const [filter, setFilter] = useState<StatusFilter>('pending');

  // Respect the selected period: filter by sale date (the "Data" column).
  const sales = useMemo(() => {
    if (!dateRange?.from) return allSales;
    const from = startOfDay(dateRange.from);
    const to = endOfDay(dateRange.to ?? dateRange.from);
    return allSales.filter((s) => {
      if (!s.sale_date) return false;
      const d = parseISO(s.sale_date);
      return d >= from && d <= to;
    });
  }, [allSales, dateRange]);

  const stats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    let pendingTotal = 0;
    let pendingCount = 0;
    let confirmedTotal = 0;
    let confirmedCount = 0;
    let monthTotal = 0;

    for (const s of sales) {
      const c = Number(s.comissao) || 0;
      if (isPending(s)) {
        pendingTotal += c;
        pendingCount++;
      } else if (isConfirmed(s)) {
        confirmedTotal += c;
        confirmedCount++;
        const ref = s.approved_at
          ? new Date(s.approved_at)
          : s.activation_date
            ? new Date(s.activation_date)
            : null;
        if (ref && ref >= monthStart) monthTotal += c;
      }
    }
    return { pendingTotal, pendingCount, confirmedTotal, confirmedCount, monthTotal };
  }, [sales]);

  const filtered = useMemo(() => {
    if (filter === 'all') return sales;
    if (filter === 'pending') return sales.filter(s => isPending(s));
    if (filter === 'confirmed') return sales.filter(s => isConfirmed(s));
    if (filter === 'cancelled') return sales.filter(s => isCancelled(s));
    return sales;
  }, [sales, filter]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-yellow-600" /> Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingTotal)}</div>
            <div className="text-xs text-muted-foreground">{stats.pendingCount} venda(s)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Confirmadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.confirmedTotal)}</div>
            <div className="text-xs text-muted-foreground">{stats.confirmedCount} venda(s)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" /> Confirmadas este mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthTotal)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
          <TabsTrigger value="cancelled">Anuladas</TabsTrigger>
          <TabsTrigger value="all">Tudo</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Sem vendas para mostrar.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Valor venda</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => {
                  const meta = badgeMeta(s);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">
                        {s.sale_date
                          ? format(new Date(s.sale_date), 'dd MMM yyyy', { locale: pt })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {s.client_name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{s.code || '-'}</span>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(s.total_value)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {s.comissao
                          ? formatCurrency(s.comissao)
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={meta.className}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
