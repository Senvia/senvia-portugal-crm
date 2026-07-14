# date-range-picker-ux - Work Plan

## TL;DR (For humans)

**What you'll get:** O seletor de período do Financeiro fica com calendário maior (2 meses em desktop), cores vivas em vez de cinzento, presets mais completos, e melhor contraste no range selecionado.

**Why this approach:** O utilizador gosta do calendário visual mas quer experiência mais dinâmica e cores melhores. Mantém-se o Calendar mas com `numberOfMonths={2}`, presets com `variant` dinâmico (ativo = `default` com cor primary), e CSS melhorado.

**What it will NOT do:** Não remove o calendário. Não muda a API do componente. Não adiciona dependências novas.

**Effort:** Quick
**Risk:** Low — CSS + layout changes only.

---

## Código completo do novo `src/components/ui/date-range-picker.tsx`

Substitui **todo o conteúdo** do ficheiro por isto:

```tsx
import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, isSameMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
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
    return isSameMonth(value.from, preset.from) &&
           value.from.getTime() === preset.from.getTime() &&
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
            {/* Presets — coluna à esquerda */}
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

            {/* Calendário — 2 meses em desktop, 1 em mobile */}
            <div className="p-1">
              <Calendar
                mode="range"
                selected={value}
                onSelect={(range) => {
                  onChange(range);
                  if (range?.from && range?.to) {
                    setOpen(false);
                  }
                }}
                numberOfMonths={2}
                locale={pt}
                className="pointer-events-auto"
                classNames={{
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_range_start: "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  day_range_end: "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  day_in_range: "bg-primary/15 text-primary",
                  day_today: "ring-1 ring-primary/40",
                }}
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
```

## Instruções para aplicar manualmente

1. Abre o ficheiro `src/components/ui/date-range-picker.tsx` no teu editor
2. Apaga todo o conteúdo
3. Cola o código acima
4. Guarda
5. No terminal, corre:
   ```
   npx tsc --noEmit --skipLibCheck
   ```
   Deve sair com exit 0.
6. Commit:
   ```
   git add src/components/ui/date-range-picker.tsx
   git commit -m "Refactor: date-range-picker UX melhorada com calendário maior e cores dinâmicas" -m "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
   git push origin Cactus
   ```

## O que mudou vs. versão anterior

| Aspecto | Antes | Agora |
|---|---|---|
| Meses visíveis | 1 mês | **2 meses** em desktop (1 em mobile) |
| Presets | 5 opções | **9 opções** (Hoje, Ontem, Este mês, Mês passado, 7/30/60/90 dias, Este ano) |
| Cor do preset ativo | ghost (cinzento) | **`default` (primary)** com sombra |
| Hover dos presets | cinzento | **`primary/10` com texto primary** |
| "Todo o histórico" | ghost | hover **vermelho** (destructive) |
| Range selecionado no calendário | cinzento claro | **primary/15** com texto primary |
| Dias de início/fim do range | cinzento | **primary** com ring |
| Hoje no calendário | sem destaque | **ring primary/40** |
| Largura da coluna de presets | 40 (sm:w-40) | **44** (sm:w-44) com gap menor |
