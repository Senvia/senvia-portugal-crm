import { useDashboardPeriod } from "@/stores/useDashboardPeriod";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Printer } from "lucide-react";
import { startOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useState } from "react";

export function DashboardPeriodFilter() {
  const { selectedMonth, setSelectedMonth } = useDashboardPeriod();
  const [open, setOpen] = useState(false);

  const handlePrintAll = () => {
    const originalTitle = document.title;
    document.title = "Senvia OS";
    window.print();
    document.title = originalTitle;
  };

  const dateRange: DateRange | undefined = {
    from: startOfMonth(selectedMonth),
    to: startOfMonth(selectedMonth),
  };

  const handleChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setSelectedMonth(startOfMonth(range.from));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <DateRangePicker
        value={dateRange}
        onChange={handleChange}
        placeholder="Selecionar mês"
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
