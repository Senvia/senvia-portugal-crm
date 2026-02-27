import { useState } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, ChevronDown, ChevronRight, Trash2, Zap } from 'lucide-react';
import { useCommissionClosings } from '@/hooks/useCommissionClosings';
import { usePermissions } from '@/hooks/usePermissions';
import { useTeamMembers } from '@/hooks/useTeam';
import { formatCurrency } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { CloseMonthModal } from './CloseMonthModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const TIER_LABELS: Record<string, string> = {
  low: 'Baixo (≤300 MWh)',
  mid: 'Médio (301–600 MWh)',
  high: 'Alto (+601 MWh)',
};

function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = startOfMonth(subMonths(now, i));
    options.push({
      value: format(d, 'yyyy-MM-dd'),
      label: format(d, 'MMMM yyyy', { locale: pt }),
    });
  }
  return options;
}

export function CommissionsTab() {
  const monthOptions = generateMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[1]?.value || monthOptions[0]?.value);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { closings, isLoading, getClosingForMonth, getItemsForClosing, deleteClosing } = useCommissionClosings();
  const { can } = usePermissions();
  const { data: members } = useTeamMembers();

  const canManage = can('finance', 'commissions', 'manage');
  const closing = getClosingForMonth(selectedMonth);
  const items = closing ? getItemsForClosing(closing.id) : [];

  // Calculate global totals from all items
  const globalMwh = items.reduce((sum, item) => sum + item.total_consumo_mwh, 0);

  const getMemberName = (userId: string) => {
    const m = members?.find((m: any) => m.user_id === userId);
    return m?.full_name || 'Desconhecido';
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month selector + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!closing && canManage && (
          <Button onClick={() => setShowCloseModal(true)}>
            <Lock className="mr-2 h-4 w-4" />
            Fechar Mês
          </Button>
        )}
      </div>

      {/* Results */}
      {closing ? (
        <div className="space-y-4">
          {/* Global Totalizer */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Totalizador Global (Angariação)</p>
                  <p className="text-2xl font-bold">{globalMwh.toFixed(1)} MWh</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-base font-semibold">
                  Total: {formatCurrency(closing.total_commission)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Detail card */}
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Detalhe por Comercial</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fechado em {format(new Date(closing.closed_at), 'dd/MM/yyyy HH:mm')} · Filtro: data de ativação
                </p>
              </div>
              {canManage && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar fechamento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá eliminar o fechamento deste mês e todos os seus dados de comissão.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteClosing.mutate(closing.id)}>
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Comercial</TableHead>
                    <TableHead className="text-right">MWh Total</TableHead>
                    <TableHead>Patamar</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <>
                      <TableRow
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => toggleExpand(item.id)}
                      >
                        <TableCell>
                          {expandedItems.has(item.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{getMemberName(item.user_id)}</TableCell>
                        <TableCell className="text-right">{item.total_consumo_mwh.toFixed(1)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{TIER_LABELS[item.volume_tier] || item.volume_tier}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.total_commission)}</TableCell>
                      </TableRow>
                      {expandedItems.has(item.id) && (
                        <TableRow key={`${item.id}-detail`}>
                          <TableCell colSpan={5} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>CPE/CUI</TableHead>
                                    <TableHead className="text-right">Consumo (kWh)</TableHead>
                                    <TableHead className="text-right">Margem (€)</TableHead>
                                    <TableHead className="text-right">Comissão Indicativa</TableHead>
                                    <TableHead className="text-right">Comissão Final</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(item.items_detail as any[]).map((d: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell className="text-xs">{d.serial_number || d.proposal_cpe_id?.slice(0, 8)}</TableCell>
                                      <TableCell className="text-right text-xs">{d.consumo_anual?.toLocaleString('pt-PT') || '—'}</TableCell>
                                      <TableCell className="text-right text-xs">{d.margem != null ? formatCurrency(d.margem) : '—'}</TableCell>
                                      <TableCell className="text-right text-xs">{d.comissao_indicativa != null ? formatCurrency(d.comissao_indicativa) : '—'}</TableCell>
                                      <TableCell className="text-right text-xs font-medium">{d.comissao_final != null ? formatCurrency(d.comissao_final) : '—'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Sem dados de comissão para este mês
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">Mês não fechado</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              As comissões deste mês ainda não foram calculadas. Clique em "Fechar Mês" para agregar o consumo (filtrado por data de ativação e tipo Angariação) e calcular as comissões finais por comercial.
            </p>
          </CardContent>
        </Card>
      )}

      {showCloseModal && (
        <CloseMonthModal
          month={selectedMonth}
          open={showCloseModal}
          onOpenChange={setShowCloseModal}
        />
      )}
    </div>
  );
}
