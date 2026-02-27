

## Plano: Multiplicador por Tipo de Negociação nas Comissões

### Regra
- **Angariação, Angariação Indexado, Sem Volume** → **100%** da tabela de comissões
- **Renovação** → **25%** da tabela de comissões

### Alterações

**1. `src/hooks/useLiveCommissions.ts`** (linhas 178-184)
- Após calcular `final_` via `calculateEnergyCommissionPure`, aplicar multiplicador baseado no `negotiation_type` do CPE
- `renovacao` → `final_ * 0.25`
- Tudo o resto → `final_ * 1.0`

**2. `src/components/finance/CloseMonthModal.tsx`** (linhas 219-225)
- Mesma lógica: aplicar multiplicador após o cálculo da comissão base, para que o fecho de mês também respeite a regra

**3. UI (CommissionsTab.tsx)**
- Opcional: mostrar o multiplicador (ex: "25%") na badge do tipo para transparência

### Lógica concreta
```typescript
const NEGOTIATION_MULTIPLIER: Record<string, number> = {
  angariacao: 1,
  angariacao_indexado: 1,
  sem_volume: 1,
  renovacao: 0.25,
};

// Após calcular final_:
const multiplier = NEGOTIATION_MULTIPLIER[cpe.negotiation_type] ?? 1;
cpe.comissao_final = (final_ ?? cpe.comissao_indicativa) * multiplier;
```

### Ficheiros afetados
- `src/hooks/useLiveCommissions.ts`
- `src/components/finance/CloseMonthModal.tsx`

Sem alterações de base de dados.

