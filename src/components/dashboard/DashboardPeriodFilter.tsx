import { useMemo } from "react";
import { useDashboardPeriod } from "@/stores/useDashboardPeriod";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Printer } from "lucide-react";
import { format, startOfMonth, subMonths } from "date-fns";
import { pt } from "date-fns/locale";

/**
 * The dashboard period is a MONTH, not a free date range.
 *
 * Every panel behind it is month-scoped by nature — objetivos mensais,
 * fecho de comissões, metas de ativação — and each one derives its own
 * startOfMonth/endOfMonth from this single value.
 *
 * This used to be a DateRangePicker, which offered "Hoje", "Últimos 7 dias",
 * "Últimos 30 dias", "Este ano" and "Todo o histórico". None of them worked:
 * the handler kept only `range.from`, snapped it to the start of its month and
 * threw `range.to` away. So "Hoje" and "Últimos 7 dias" both silently became
 * the whole current month, "Últimos 30 dias" became the whole PREVIOUS month
 * (excluding today), "Este ano" became January, and "Todo o histórico" (which
 * passes undefined) did nothing at all. The button then displayed the collapsed
 * range as "01/08/26 — 01/08/26" — which is what made it read as "o filtro não
 * está a aplicar". It was applying; it just never meant what it showed.
 *
 * A month selector is the honest control for what the data supports, and it
 * matches the month pickers already used in Financeiro and no Tráfego Pago.
 */
const MONTHS_BACK = 24;

export function DashboardPeriodFilter() {
  const { selectedMonth, setSelectedMonth } = useDashboardPeriod();

  const options = useMemo(() => {
    const now = new Date();
    return Array.from({ length: MONTHS_BACK }, (_, i) => {
      const d = startOfMonth(subMonths(now, i));
      return { value: format(d, "yyyy-MM-dd"), label: format(d, "MMMM yyyy", { locale: pt }) };
    });
  }, []);

  const handlePrintAll = () => {
    const originalTitle = document.title;
    document.title = "Senvia OS";
    window.print();
    document.title = originalTitle;
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={format(startOfMonth(selectedMonth), "yyyy-MM-dd")}
        // Parsed as local midnight (not `new Date(value)`, which reads a bare
        // yyyy-MM-dd as UTC and can land on the previous month in Lisbon).
        onValueChange={(value) => {
          const [y, m, d] = value.split("-").map(Number);
          setSelectedMonth(new Date(y, m - 1, d));
        }}
      >
        <SelectTrigger className="h-9 w-[160px] gap-1.5 capitalize sm:w-[180px]">
          <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
          <SelectValue placeholder="Selecionar mês" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="capitalize">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 no-print"
        onClick={handlePrintAll}
        title="Imprimir dashboard"
      >
        <Printer className="h-4 w-4" />
      </Button>
    </div>
  );
}
