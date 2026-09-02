import { useMemo } from 'react';
import { AlertTriangle, Check, Undo2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useSaleChargebacks,
  useUpdateChargebackStatus,
  CHARGEBACK_STATUS_LABELS,
  type ChargebackStatus,
} from '@/hooks/useSaleChargebacks';

const STATUS_STYLES: Record<ChargebackStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  reconciled: 'bg-red-500/20 text-red-500 border-red-500/30',
  dismissed: 'bg-slate-500/20 text-slate-500 border-slate-500/30',
};

/**
 * Commission clawed back when a telecom sale is cancelled AFTER install.
 * Rows appear automatically the moment a sale is marked "Cancelado" — they
 * are a projection until the operator's own chargeback file confirms them,
 * which is what "Confirmar" / "Descartar" record.
 */
export function ChargebacksTab() {
  const { data: chargebacks = [], isLoading } = useSaleChargebacks();
  const updateStatus = useUpdateChargebackStatus();
  const { isAdmin } = usePermissions();

  const totals = useMemo(() => {
    const sum = (status: ChargebackStatus) =>
      chargebacks.filter(c => c.status === status).reduce((acc, c) => acc + (c.amount || 0), 0);
    return {
      pending: sum('pending'),
      reconciled: sum('reconciled'),
      pendingCount: chargebacks.filter(c => c.status === 'pending').length,
    };
  }, [chargebacks]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Por confirmar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totals.pending)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.pendingCount} venda{totals.pendingCount === 1 ? '' : 's'} cancelada{totals.pendingCount === 1 ? '' : 's'} após instalação
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Confirmados</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-500">{formatCurrency(totals.reconciled)}</p>
            <p className="text-xs text-muted-foreground mt-1">Já descontados da comissão</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chargebacks (CB)</CardTitle>
          <CardDescription>
            Gerados automaticamente quando uma venda passa a "Cancelado" (cancelada após a instalação).
            Vendas anuladas antes da instalação não geram CB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : chargebacks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sem chargebacks. Aparecem aqui assim que uma venda for marcada como cancelada após a instalação.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venda</TableHead>
                    <TableHead>Beneficiário</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Estado</TableHead>
                    {isAdmin && <TableHead className="w-32" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chargebacks.map(cb => (
                    <TableRow key={cb.id}>
                      <TableCell className="text-sm">
                        <span className="font-medium">{cb.sale?.code ?? '—'}</span>
                        {cb.sale?.sale_date && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {new Date(cb.sale.sale_date).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{cb.beneficiary_name ?? '—'}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-red-500">
                        −{formatCurrency(cb.amount || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLES[cb.status]}>
                          {CHARGEBACK_STATUS_LABELS[cb.status]}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {cb.status === 'pending' ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Confirmar — a operadora cobrou mesmo"
                                  onClick={() => updateStatus.mutate({ id: cb.id, status: 'reconciled' })}
                                >
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Descartar — não se aplica"
                                  onClick={() => updateStatus.mutate({ id: cb.id, status: 'dismissed' })}
                                >
                                  <X className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Voltar a por confirmar"
                                onClick={() => updateStatus.mutate({ id: cb.id, status: 'pending' })}
                              >
                                <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
