

## Adicionar Campos de Recorrencia ao Modal de Edicao de Venda

### Problema Identificado

Ao editar uma venda e adicionar um produto mensal/recorrente, nao existe forma de definir:
- A data da proxima cobranca (renovacao)
- O valor recorrente mensal
- Se a venda tem ou nao recorrencia ativa

Atualmente, estes valores sao calculados automaticamente apenas na criacao, mas nao podem ser editados posteriormente.

---

### Solucao

Adicionar uma nova seccao "Recorrencia" no modal de edicao de vendas, semelhante ao que ja existe na criacao, permitindo:

1. Toggle para ativar/desativar recorrencia
2. Campo para definir o valor mensal recorrente
3. Datepicker para a proxima data de renovacao
4. Estado da recorrencia (ativo/pausado/cancelado)

---

### Nova Interface no EditSaleModal

```text
┌──────────────────────────────────────────────────────────────────┐
│  EDITAR VENDA #0045                                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Cliente e Data atuais...]                                      │
│                                                                  │
│  [Produtos/Servicos...]                                          │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│                                                                  │
│  🔄 RECORRENCIA                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  Venda tem produto recorrente?              [ON/OFF]       │  │
│  │                                                            │  │
│  │  (Se ON, mostrar:)                                         │  │
│  │                                                            │  │
│  │  Valor Mensal (€)          Proxima Cobranca                │  │
│  │  [99,00            ]       [📅 05/03/2026      ]           │  │
│  │                                                            │  │
│  │  Estado                                                    │  │
│  │  [🟢 Ativo ▼]                                              │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Pagamentos...]                                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Comportamento

| Acao | Resultado |
|------|-----------|
| Ativar toggle | Mostra campos de valor e data |
| Adicionar produto recorrente | Sugere ativar toggle (auto-calcula valor) |
| Guardar com toggle ON | Grava `has_recurring=true`, `recurring_value`, `next_renewal_date`, `recurring_status` |
| Guardar com toggle OFF | Grava `has_recurring=false`, limpa campos de recorrencia |

---

### Auto-Calculo do Valor Recorrente

Quando o utilizador adiciona/remove produtos, o sistema pode sugerir o valor recorrente baseado nos produtos marcados como `is_recurring`:

```text
Produtos adicionados:
- Instalacao (unico): €500
- Manutencao Mensal (recorrente): €99  ← Este conta para recorrencia

Valor mensal sugerido: €99
```

O utilizador pode aceitar a sugestao ou editar manualmente.

---

### Ficheiro a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/sales/EditSaleModal.tsx` | Adicionar seccao de recorrencia com toggle, campos de valor/data e estado |
| `src/hooks/useSales.ts` | Adicionar campos de recorrencia ao `useUpdateSale` |

---

### Implementacao Tecnica

#### 1. Novos Estados no EditSaleModal

```typescript
// Campos de recorrencia
const [hasRecurring, setHasRecurring] = useState(false);
const [recurringValue, setRecurringValue] = useState("0");
const [nextRenewalDate, setNextRenewalDate] = useState<Date | undefined>();
const [recurringStatus, setRecurringStatus] = useState<RecurringStatus>("active");
```

#### 2. Inicializacao com Dados da Venda

```typescript
useEffect(() => {
  if (open && sale) {
    // ... campos existentes
    setHasRecurring(sale.has_recurring || false);
    setRecurringValue(sale.recurring_value?.toString() || "0");
    setNextRenewalDate(sale.next_renewal_date 
      ? parseISO(sale.next_renewal_date) 
      : undefined);
    setRecurringStatus(sale.recurring_status || "active");
  }
}, [open, sale]);
```

#### 3. Auto-Calculo ao Modificar Items

```typescript
// Quando items mudam, sugerir valor recorrente
useEffect(() => {
  if (!hasRecurring) return;
  
  const recurringItems = items.filter(item => {
    const product = products?.find(p => p.id === item.product_id);
    return product?.is_recurring;
  });
  
  const suggestedValue = recurringItems.reduce(
    (sum, item) => sum + (item.quantity * item.unit_price), 0
  );
  
  if (suggestedValue > 0 && suggestedValue !== parseFloat(recurringValue)) {
    // Mostrar sugestao ou atualizar automaticamente
    setRecurringValue(suggestedValue.toString());
  }
}, [items, products, hasRecurring]);
```

#### 4. UI da Seccao de Recorrencia

```tsx
<Separator />
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label className="flex items-center gap-2">
      <RefreshCw className="h-4 w-4 text-muted-foreground" />
      Recorrência Mensal
    </Label>
    <Switch
      checked={hasRecurring}
      onCheckedChange={setHasRecurring}
      disabled={!canFullEdit}
    />
  </div>
  
  {hasRecurring && (
    <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valor Mensal (€)</Label>
          <Input
            type="number"
            value={recurringValue}
            onChange={(e) => setRecurringValue(e.target.value)}
            step="0.01"
            min="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Próxima Cobrança</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {nextRenewalDate 
                  ? format(nextRenewalDate, "PPP", { locale: pt }) 
                  : "Selecionar..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={nextRenewalDate}
                onSelect={setNextRenewalDate}
                locale={pt}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Estado</Label>
        <Select value={recurringStatus} onValueChange={setRecurringStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">🟢 Ativo</SelectItem>
            <SelectItem value="paused">🟠 Pausado</SelectItem>
            <SelectItem value="cancelled">🔴 Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )}
</div>
```

#### 5. Incluir na Submissao

```typescript
await updateSale.mutateAsync({
  saleId: sale.id,
  updates: {
    // ... campos existentes
    has_recurring: hasRecurring,
    recurring_value: hasRecurring ? parseFloat(recurringValue) : 0,
    next_renewal_date: hasRecurring && nextRenewalDate 
      ? format(nextRenewalDate, 'yyyy-MM-dd') 
      : null,
    recurring_status: hasRecurring ? recurringStatus : null,
  },
});
```

---

### Resumo de Alteracoes

| Ficheiro | Tipo | Descricao |
|----------|------|-----------|
| `src/components/sales/EditSaleModal.tsx` | Modificar | Adicionar seccao de recorrencia com toggle, valor, data e estado |
| `src/hooks/useSales.ts` | Modificar | Adicionar campos de recorrencia ao `useUpdateSale` |

**Total: 2 ficheiros modificados**

