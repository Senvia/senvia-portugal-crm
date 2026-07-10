import * as React from "react";
import { RangeCalendar } from "@/components/ui/calendar-rac";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";
import { pt } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { parseDate, getLocalTimeZone } from "@internationalized/date";
import type { DateRange as RacDateRange } from "react-aria-components";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

function toRacRange(range: DateRange | undefined): RacDateRange | null {
  if (!range?.from) return null;
  const start = parseDate(format(range.from, "yyyy-MM-dd"));
  const end = range.to ? parseDate(format(range.to, "yyyy-MM-dd")) : start;
  return { start, end };
}

function fromRacRange(range: RacDateRange | null): DateRange | undefined {
  if (!range) return undefined;
  return {
    from: range.start.toDate(getLocalTimeZone()),
    to: range.end.toDate(getLocalTimeZone()),
  };
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Selecionar período",
  className
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const formatRange = () => {
    if (!value?.from) return placeholder;
    if (!value.to) return format(value.from, "dd/MM/yyyy", { locale: pt });
    return `${format(value.from, "dd/MM/yy", { locale: pt })} — ${format(value.to, "dd/MM/yy", { locale: pt })}`;
  };

  const hasValue = value?.from !== undefined;

  const presets = React.useMemo(() => {
    const now = new Date();
    const lastMonthStart = startOfMonth(subDays(startOfMonth(now), 1));
    return [
      { label: "Hoje", range: { from: now, to: now } },
      { label: "Ontem", range: { from: subDays(now, 1), to: subDays(now, 1) } },
      { label: "Este mês", range: { from: startOfMonth(now), to: endOfMonth(now) } },
      { label: "Mês passado", range: { from: lastMonthStart, to: endOfMonth(lastMonthStart) } },
      { label: "Últimos 7 dias", range: { from: subDays(now, 6), to: now } },
      { label: "Últimos 30 dias", range: { from: subDays(now, 29), to: now } },
      { label: "Últimos 60 dias", range: { from: subDays(now, 59), to: now } },
      { label: "Últimos 90 dias", range: { from: subDays(now, 89), to: now } },
      { label: "Este ano", range: { from: startOfYear(now), to: endOfYear(now) } },
    ];
  }, [open]);

  const applyPreset = (range: DateRange) => {
    onChange(range);
    setOpen(false);
  };

  const isPresetActive = (preset: { from: Date; to: Date }) => {
    if (!value?.from || !value?.to) return false;
    return value.from.getTime() === preset.from.getTime() &&
           value.to.getTime() === preset.to.getTime();
  };

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !hasValue && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            <div className="flex flex-row flex-wrap gap-1 border-b p-2 sm:w-44 sm:flex-col sm:flex-nowrap sm:gap-0.5 sm:border-b-0 sm:border-r">
              {presets.map((p) => {
                const active = isPresetActive(p.range);
                return (
                  <Button
                    key={p.label}
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "justify-start font-normal text-xs",
                      active && "shadow-sm",
                      !active && "hover:bg-primary/10 hover:text-primary"
                    )}
                    onClick={() => applyPreset(p.range)}
                  >
                    {p.label}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="justify-start font-normal text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => { onChange(undefined); setOpen(false); }}
              >
                Todo o histórico
              </Button>
            </div>
            <div className="p-1">
              <RangeCalendar
                aria-label="Selecionar período"
                value={toRacRange(value)}
                onChange={(range) => {
                  onChange(fromRacRange(range));
                  if (range) {
                    setOpen(false);
                  }
                }}
                className="rounded-lg border border-border bg-background p-2"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {hasValue && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(undefined)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
