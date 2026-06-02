import { useMemo, useState } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronRight, FileX, Search, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { matchesSearch } from '@/lib/utils';
import { useTeamFilter } from '@/hooks/useTeamFilter';
import { TeamMemberFilter } from '@/components/dashboard/TeamMemberFilter';
import { useTeamCommissions } from '@/hooks/useTeamCommissions';

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

export function TeamCommissionsTab() {
  const { effectiveUserIds, canFilterByTeam } = useTeamFilter();
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value);
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useTeamCommissions(selectedMonth, effectiveUserIds);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const commercials = data?.commercials || [];
  const totalCommission = data?.totalCommission || 0;
  const totalSales = data?.salesCount || 0;

  const filtered = commercials.filter(c => matchesSearch(searchTerm, c.name));

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
      <div className="flex flex-col sm:flex-row gap-3">
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
        {canFilterByTeam && <TeamMemberFilter />}
        <div className="relative flex-1 sm:max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar comercial..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {commercials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileX className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">Sem comissões neste mês</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Apenas vendas marcadas como "Entregue" entram na contagem. Ainda nenhuma venda foi entregue neste período.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Comissões do Mês</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalCommission)}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-sm">
                {totalSales} venda(s) entregue(s)
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Comercial</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(entry => (
                    <>
                      <TableRow
                        key={entry.userId}
                        className="cursor-pointer"
                        onClick={() => toggle(entry.userId)}
                      >
                        <TableCell>
                          {expanded.has(entry.userId)
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="font-medium">{entry.name}</TableCell>
                        <TableCell className="text-right">{entry.salesCount}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(entry.totalCommission)}
                        </TableCell>
                      </TableRow>
                      {expanded.has(entry.userId) && (
                        <TableRow key={`${entry.userId}-detail`}>
                          <TableCell colSpan={4} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead className="text-right">Valor venda</TableHead>
                                    <TableHead className="text-right">Comissão</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {entry.sales.map(s => (
                                    <TableRow key={s.saleId}>
                                      <TableCell className="text-xs">
                                        {(s.activationDate || s.saleDate)
                                          ? format(new Date(s.activationDate || s.saleDate!), 'dd MMM yyyy', { locale: pt })
                                          : '—'}
                                      </TableCell>
                                      <TableCell className="text-xs">{s.clientName || '—'}</TableCell>
                                      <TableCell className="text-xs font-mono">{s.saleCode || '—'}</TableCell>
                                      <TableCell className="text-right text-xs">{formatCurrency(s.totalValue)}</TableCell>
                                      <TableCell className="text-right text-xs font-medium">
                                        {formatCurrency(s.comissao)}
                                      </TableCell>
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
