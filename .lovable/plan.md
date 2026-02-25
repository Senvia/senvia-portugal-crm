

## Colunas Dinâmicas por Método de Cálculo

### Problema

Actualmente, todos os 4 métodos mostram as mesmas 6 colunas (kWp Min, kWp Max, Base Trans., Adic. Trans., Base AAS, Adic. AAS). Mas cada método usa campos diferentes na fórmula, então as colunas devem reflectir isso.

### Colunas por Método

```text
┌─────────────────────────┬──────────────────────────────────────────────────┐
│ Método                  │ Colunas da Tabela                                │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ Escalões por kWp        │ kWp Min │ kWp Max │ Base Trans. (€) │            │
│                         │ Adic. Trans. (€/kWp) │ Base AAS (€) │            │
│                         │ Adic. AAS (€/kWp)                                │
│                         │ → 6 colunas (actual, mantém)                     │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ Base + € × kWp          │ kWp Min │ kWp Max │ Base Trans. (€) │            │
│                         │ Taxa Trans. (€/kWp) │ Base AAS (€) │             │
│                         │ Taxa AAS (€/kWp)                                 │
│                         │ → 6 colunas (labels diferentes)                  │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ Fórmula kWp + %         │ kWp Min │ kWp Max │ % Trans. │ % AAS            │
│                         │ → 4 colunas (sem "Adic", só percentagem)         │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ % da Venda/Proposta     │ Valor Min (€) │ Valor Max (€) │ % Trans. │ % AAS│
│                         │ → 4 colunas (não usa kWp, usa valor)             │
└─────────────────────────┴──────────────────────────────────────────────────┘
```

### O que muda

**`src/components/settings/CommissionMatrixTab.tsx`** — `TieredTableEditor`

1. Criar uma configuração de colunas por método que define:
   - Quais campos mostrar (das 6 propriedades do `SolarTier`)
   - Qual o label de cada coluna
   - Qual o placeholder/sufixo (€, %, €/kWp)

2. Para `percentage_valor`: os campos `kwpMin`/`kwpMax` passam a ter label "Valor Min (€)" / "Valor Max (€)" — reutilizam os mesmos campos do tier mas com significado diferente (range de valor em vez de range de kWp)

3. Para `formula_percentage`: esconder as colunas `adicTransaccional` e `adicAas` (não se usam — a comissão é só a percentagem)

4. O `colSpan` do estado vazio e a importação Excel adaptam-se ao número de colunas visíveis

**`src/hooks/useCommissionMatrix.ts`** — `calculateCommission`

- Para `percentage_valor`: o `findTier` passa a usar o `valor` da proposta (em vez de kWp) para encontrar o escalão correcto — o campo `kwpMin`/`kwpMax` do tier é interpretado como "valorMin"/"valorMax"

### Detalhe técnico

Os dados continuam guardados na mesma estrutura `SolarTier` com 6 campos. A diferença é apenas na UI:
- Métodos com 4 colunas simplesmente não mostram os campos que não se aplicam (ficam a 0 no banco)
- O `percentage_valor` reinterpreta `kwpMin`/`kwpMax` como ranges de valor monetário
- A lógica de cálculo no hook já está correcta para cada método; apenas o `findTier` do `percentage_valor` precisa de usar `detail.valor` em vez de `kwp`

