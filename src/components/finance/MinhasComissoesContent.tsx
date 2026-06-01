import { useMemo, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wallet, Clock, CheckCircle2 } from 'lucide-react';
import { useMyCommissions } from '@/hooks/useSalesApproval';
import { formatCurrency } from '@/lib/format';

type StatusFilter = 'pending' | 'confirmed' | 'cancelled' | 'all';

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  in_progress: { label: 'Pendente', className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  delivered: { label: 'Confirmada', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  fulfilled: { label: 'Confirmada', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  cancelled: { label: 'Anulada', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
};

const isPending = (status: string) => status === 'pending' || status === 'in_progress';
const isConfirmed = (status: string) => status === 'delivered' || status === 'fulfilled';
const isCancelled = (status: string) => status === 'cancelled';

export function MinhasComissoesContent() {
  const { data: sales = [], isLoading } = useMyCommissions();
  const [filter, setFilter] = useState<StatusFilter>('pending');

  const stats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    let pendingTotal = 0;
    let pendingCount = 0;
    let confirmedTotal = 0;
    let confirmedCount = 0;
    let monthTotal = 0;

    for (const s of sales) {
      const c = Number(s.comissao) || 0;
      if (isPending(s.status)) {
        pendingTotal += c;
        pendingCount++;
      } else if (isConfirmed(s.status)) {
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
    if (filter === 'pending') return sales.filter(s => isPending(s.status));
    if (filter === 'confirmed') return sales.filter(s => isConfirmed(s.status));
    if (filter === 'cancelled') return sales.filter(s => isCancelled(s.status));
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
                  const meta = STATUS_META[s.status] || { label: s.status, className: '' };
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
