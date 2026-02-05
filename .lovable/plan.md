

## Adicionar Filtros Avançados ao Modulo Financeiro

### Conceito

O modulo financeiro precisa de filtros robustos para permitir analises precisas. O filtro de data sera um unico campo de calendario onde o utilizador seleciona a data de inicio e fim (range selection).

---

### Filtros a Implementar

#### Pagina Dashboard Financeiro (`/financeiro`)

| Filtro | Tipo | Opcoes |
|--------|------|--------|
| Periodo | Date Range Picker | Data inicio e fim num unico calendario |

Os cards de metricas e o grafico serao recalculados com base no periodo selecionado.

#### Pagina Pagamentos (`/financeiro/pagamentos`)

| Filtro | Tipo | Opcoes |
|--------|------|--------|
| Pesquisa | Input texto | Cliente, venda, fatura |
| Periodo | Date Range Picker | Data inicio e fim |
| Estado | Select | Todos, Pagos, Agendados |
| Metodo | Select | Todos, MB Way, Transferencia, etc. |

#### Pagina Faturas (`/financeiro/faturas`)

| Filtro | Tipo | Opcoes |
|--------|------|--------|
| Pesquisa | Input texto | Referencia, cliente, venda |
| Periodo | Date Range Picker | Data inicio e fim |

---

### Date Range Picker (Um Unico Calendario)

Usaremos o `mode="range"` do react-day-picker que permite selecionar data inicial e final num unico calendario.

**Interface:**

```text
┌─────────────────────────────────────────────────┐
│  [📅 01/01/2026 - 31/01/2026 ▼]                │
└─────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────┐
│     ◄    Janeiro 2026    ►                      │
├─────────────────────────────────────────────────┤
│  Seg  Ter  Qua  Qui  Sex  Sab  Dom              │
│   ·    ·    [1]  2    3    4    5               │
│   6    7    8    9   10   11   12               │
│  13   14   15   16   17   18   19               │
│  20   21   22   23   24   25   26               │
│  27   28   29   30  [31]  ·    ·                │
└─────────────────────────────────────────────────┘

[1] = Data inicio (azul solido)
[31] = Data fim (azul solido)
2-30 = Range selecionado (azul claro)
```

**Comportamento:**
- Primeiro clique: define data inicio
- Segundo clique: define data fim
- O range entre as datas fica destacado
- Botao para limpar as datas selecionadas

---

### Interface Proposta

#### Dashboard Financeiro

```text
┌────────────────────────────────────────────────────────────────────┐
│  💰 FINANCEIRO                                                     │
├────────────────────────────────────────────────────────────────────┤
│  Periodo: [📅 01/01/2026 - 31/01/2026 ▼] [× Limpar]               │
│                                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ Faturado    │  │ Recebido    │  │ Pendente    │  │ A Vencer  │ │
│  │ €15.000     │  │ €8.500      │  │ €6.500      │  │ €2.000    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                    │
│  [📊 Grafico filtrado pelo periodo selecionado]                   │
└────────────────────────────────────────────────────────────────────┘
```

#### Pagamentos

```text
┌────────────────────────────────────────────────────────────────────┐
│  💳 PAGAMENTOS                                    [Exportar]       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [🔍 Pesquisar...         ] [📅 Periodo ▼] [Estado ▼] [Metodo ▼]  │
│  [× Limpar filtros]                                                │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Data       │ Venda   │ Cliente    │ Valor  │ Metodo  │ Estado ││
│  └────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

---

### Componente DateRangePicker

Criar um componente reutilizavel para o date range picker:

```typescript
// src/components/ui/date-range-picker.tsx

interface DateRangePickerProps {
  value: { from: Date | undefined; to: Date | undefined };
  onChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  placeholder?: string;
  className?: string;
}
```

Caracteristicas:
- Botao que mostra o range selecionado formatado
- Popover com calendario em modo range
- Suporte para limpar selecao
- Estilo consistente com o resto do sistema
- Locale em portugues

---

### Ficheiros a Criar

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/components/ui/date-range-picker.tsx` | Novo | Componente reutilizavel de date range |

---

### Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/Finance.tsx` | Adicionar filtro de periodo e passar para o hook |
| `src/pages/finance/Payments.tsx` | Adicionar filtros de periodo e metodo |
| `src/pages/finance/Invoices.tsx` | Adicionar filtro de periodo |
| `src/hooks/useFinanceStats.ts` | Receber parametros de filtro de data |

---

### Detalhes Tecnicos

#### 1. Componente DateRangePicker

```typescript
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({ value, onChange, placeholder = "Selecionar periodo", className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const formatRange = () => {
    if (!value?.from) return placeholder;
    if (!value.to) return format(value.from, "dd/MM/yyyy", { locale: pt });
    return `${format(value.from, "dd/MM/yy", { locale: pt })} - ${format(value.to, "dd/MM/yy", { locale: pt })}`;
  };

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={className}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={1}
            locale={pt}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {value?.from && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={() => onChange(undefined)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

#### 2. Filtros na Pagina Payments

```typescript
// Estados
const [dateRange, setDateRange] = useState<DateRange | undefined>();
const [methodFilter, setMethodFilter] = useState<string>("all");

// Logica de filtragem
const filteredPayments = useMemo(() => {
  return payments.filter(payment => {
    // Filtro de data
    if (dateRange?.from) {
      const paymentDate = new Date(payment.payment_date);
      if (paymentDate < dateRange.from) return false;
      if (dateRange.to && paymentDate > endOfDay(dateRange.to)) return false;
    }
    
    // Filtro de metodo
    if (methodFilter !== "all" && payment.payment_method !== methodFilter) {
      return false;
    }
    
    // ... outros filtros existentes
    return true;
  });
}, [payments, dateRange, methodFilter, /* ... */]);
```

#### 3. Filtros no Dashboard Finance

O hook `useFinanceStats` sera modificado para receber parametros opcionais de data:

```typescript
// useFinanceStats.ts
export function useFinanceStats(dateRange?: { from?: Date; to?: Date }) {
  // Filtra pagamentos pelo range de data antes de calcular estatisticas
  const filteredPayments = payments.filter(p => {
    const date = new Date(p.payment_date);
    if (dateRange?.from && date < dateRange.from) return false;
    if (dateRange?.to && date > endOfDay(dateRange.to)) return false;
    return true;
  });
  
  // Calcular stats com filteredPayments
}
```

---

### Layout Mobile (First Mobile)

Os filtros serao responsivos:

**Desktop:**
```text
[🔍 Pesquisar...] [📅 Periodo ▼] [Estado ▼] [Metodo ▼] [× Limpar]
```

**Mobile:**
```text
┌─────────────────────────────────────────┐
│ [🔍 Pesquisar...                     ] │
├─────────────────────────────────────────┤
│ [📅 Periodo] [Estado ▼] [Metodo ▼]     │
│ [× Limpar]                              │
└─────────────────────────────────────────┘
```

Os filtros ficam em linhas separadas com scroll horizontal se necessario.

---

### Resumo de Implementacao

| Passo | Tipo | Descricao |
|-------|------|-----------|
| 1 | Componente | Criar `DateRangePicker` reutilizavel |
| 2 | Hook | Modificar `useFinanceStats` para aceitar filtros |
| 3 | Dashboard | Adicionar filtro de periodo ao `Finance.tsx` |
| 4 | Pagamentos | Adicionar filtros de periodo e metodo |
| 5 | Faturas | Adicionar filtro de periodo |

**Total: 1 novo componente + 4 ficheiros modificados**

