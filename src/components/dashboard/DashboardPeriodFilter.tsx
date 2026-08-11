import { useDashboardPeriod } from "@/stores/useDashboardPeriod";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Printer } from "lucide-react";
import type { DateRange } from "react-day-picker";

/**
 * Mesmo DateRangePicker do Financeiro — o intervalo escolhido é agora guardado
 * inteiro. O handler antigo ficava com `range.from`, encostava-o ao início do
 * mês e deitava fora o `range.to`, e era isso que fazia "Hoje" e "Últimos 7
 * dias" darem os dois o mês inteiro, "Últimos 30 dias" dar o mês anterior e
 * "Todo o histórico" não fazer nada.
 */
export function DashboardPeriodFilter() {
  const { from, to, setRange } = useDashboardPeriod();

  const handlePrintAll = () => {
    const originalTitle = document.title;
    document.title = "Senvia OS";
    window.print();
    document.title = originalTitle;
  };

  const dateRange: DateRange | undefined = from ? { from, to: to ?? from } : undefined;

  return (
    <div className="flex items-center gap-2">
      <DateRangePicker
        value={dateRange}
        onChange={setRange}
        placeholder="Todo o histórico"
        className="h-9"
      />
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
