import { useMemo } from 'react';
import { addMonths, endOfMonth, startOfMonth, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarClock, CheckCircle2, Wrench, XCircle, CalendarOff, Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSales } from '@/hooks/useSales';
import { useDashboardPeriod, formatPeriodLabel } from '@/stores/useDashboardPeriod';
import type { TelecomStatus } from '@/types/sales';

interface Metric {
  key: string;
  label: string;
  hint: string;
  value: number;
  icon: typeof CheckCircle2;
  tone: string;
}

/**
 * Where the month's telecom sales actually stand: installed, still waiting,
 * booked for next month, cancelled before install — and the total those add
 * up to. Sales with no install date booked are counted separately instead of
 * being folded into a month they were never promised for.
 */
export function TelecomLifecyclePanel() {
  const { data: sales = [], isLoading } = useSales();
  const { from, to } = useDashboardPeriod();

  const { metrics, total, undated, nextMonthLabel } = useMemo(() => {
    const start = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;

    // The period picks WHICH sales are in play (by sale date); the lifecycle
    // counts below are then the state those sales are in right now.
    const inPeriod = sales.filter((s) => {
      if (!start || !end) return true;
      if (!s.sale_date) return false;
      const d = new Date(s.sale_date);
      return d >= start && d <= end;
    });

    const nextMonthStart = startOfMonth(addMonths(start ?? new Date(), 1));
    const nextMonthEnd = endOfMonth(nextMonthStart);

    const byStatus = (...statuses: TelecomStatus[]) =>
      inPeriod.filter((s) => statuses.includes(s.telecom_status as TelecomStatus)).length;

    const ativos = byStatus('ativo');
    const porInstalar = byStatus('pendente', 'em_instalacao');
    const anulados = byStatus('anulado');
    const cancelados = byStatus('cancelado');

    // Booked for next month, regardless of the period filter — this is a
    // forward look, not a slice of the period.
    const proximoMes = sales.filter((s) => {
      if (!s.scheduled_install_date) return false;
      const d = new Date(s.scheduled_install_date);
      return d >= nextMonthStart && d <= nextMonthEnd;
    }).length;

    // Still to install and with no date agreed — the number that would
    // silently disappear if we only ever counted scheduled months.
    const semData = inPeriod.filter(
      (s) => !s.scheduled_install_date &&
        (s.telecom_status === 'pendente' || s.telecom_status === 'em_instalacao'),
    ).length;

    const metrics: Metric[] = [
      { key: 'ativos', label: 'Ativos', hint: 'Instalados', value: ativos, icon: CheckCircle2, tone: 'text-green-600' },
      { key: 'por_instalar', label: 'Por instalar', hint: 'Pendentes e em instalação', value: porInstalar, icon: Wrench, tone: 'text-blue-600' },
      { key: 'proximo_mes', label: 'Instalações no próximo mês', hint: format(nextMonthStart, 'MMMM yyyy', { locale: pt }), value: proximoMes, icon: CalendarClock, tone: 'text-violet-600' },
      { key: 'anulados', label: 'Anulados', hint: 'Antes da instalação — sem CB', value: anulados, icon: XCircle, tone: 'text-slate-500' },
      { key: 'cancelados', label: 'Cancelados', hint: 'Após instalação — geram CB', value: cancelados, icon: XCircle, tone: 'text-red-500' },
    ];

    return {
      metrics,
      total: ativos + porInstalar + anulados + proximoMes,
      undated: semData,
      nextMonthLabel: format(nextMonthStart, 'MMMM', { locale: pt }),
    };
  }, [sales, from, to]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Análise do mês</CardTitle>
        <CardDescription>
          Estado das vendas de {formatPeriodLabel(from, to)}
          {undated > 0 && ` · ${undated} instalaç${undated === 1 ? 'ão' : 'ões'} sem data marcada`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {metrics.map(({ key, label, hint, value, icon: Icon, tone }) => (
            <div key={key} className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className={cn('h-3.5 w-3.5 shrink-0', tone)} />
                <span className="truncate">{label}</span>
              </div>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
              <p className="text-[11px] text-muted-foreground truncate">{hint}</p>
            </div>
          ))}

          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Vendas no total</span>
            </div>
            <p className="mt-1 text-2xl font-semibold">{total}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              Ativos + por instalar + anulados + {nextMonthLabel}
            </p>
          </div>
        </div>

        {undated > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-400">
            <CalendarOff className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {undated} venda{undated === 1 ? '' : 's'} por instalar sem data marcada — não entram na contagem do próximo mês.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
