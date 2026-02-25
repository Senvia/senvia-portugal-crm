

## Redesenhar Interface da Matriz de Comissões — Formulários por Método

### Entendimento

O utilizador quer que **apenas** "Escalões por kWp" tenha tabela com linhas. Os outros 3 métodos devem ser formulários simples (campos inline) sem escalões/ranges.

### Layout Visual por Método

```text
┌─────────────────────────────────────────────────────────┐
│ 1. Escalões por kWp (mantém tabela actual)              │
│                                                         │
│ ┌────────┬────────┬──────────┬──────────┬──────┬──────┐ │
│ │kWp Min │kWp Max │Base T.(€)│Adic T.   │Base A│Adic A│ │
│ │  0     │  4,1   │  50      │  10      │  40  │  8   │ │
│ │  4,1   │  15    │  80      │  12      │  60  │  10  │ │
│ └────────┴────────┴──────────┴──────────┴──────┴──────┘ │
│ [+ Adicionar Linha]  [Importar]                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 2. Base + € × kWp (formulário simples)                  │
│                                                         │
│ Transacional:                                           │
│   Base (€) [ 50,00 ]  +  €/kWp [ 10,00 ]  × kWp (auto)│
│                                                         │
│ AAS:                                                    │
│   Base (€) [ 40,00 ]  +  €/kWp [ 8,00  ]  × kWp (auto)│
│                                                         │
│ Fórmula: Comissão = Base + (€/kWp × kWp da proposta)    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 3. Fórmula kWp + % (formulário com fórmula visual)      │
│                                                         │
│ kWp = ( Valor (auto) × [ 0,67 ] ) / [ 1000 ]           │
│                                                         │
│ Transacional:                                           │
│   Comissão = kWp resultado × [ 5 ] %                   │
│                                                         │
│ AAS:                                                    │
│   Comissão = kWp resultado × [ 4 ] %                   │
│                                                         │
│ Fórmula: kWp derivado, comissão = percentagem do kWp    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 4. % da Venda/Proposta (formulário simples)             │
│                                                         │
│ Transacional:                                           │
│   Valor (auto) × [ 5 ] %  → Comissão                   │
│                                                         │
│ AAS:                                                    │
│   Valor (auto) × [ 4 ] %  → Comissão                   │
│                                                         │
│ Fórmula: Comissão = Valor da proposta × percentagem     │
└─────────────────────────────────────────────────────────┘
```

Os campos marcados `(auto)` são labels não editáveis — indicam que o valor vem da proposta/venda.

### Alterações na Estrutura de Dados

**`src/hooks/useCommissionMatrix.ts`** — Expandir `CommissionRule`:

```typescript
export interface CommissionRule {
  method: 'tiered_kwp' | 'base_plus_per_kwp' | 'formula_percentage' | 'percentage_valor';
  // Só usado em tiered_kwp
  tiers: SolarTier[];
  // Usado em base_plus_per_kwp
  baseTrans?: number;
  ratePerKwpTrans?: number;
  baseAas?: number;
  ratePerKwpAas?: number;
  // Usado em formula_percentage
  factor?: number;
  divisor?: number;
  pctTrans?: number;
  pctAas?: number;
  // Usado em percentage_valor (reutiliza pctTrans/pctAas)
}
```

Actualizar `calculateCommission`:
- `base_plus_per_kwp`: `Comissão = baseTrans + ratePerKwpTrans × kWp` (ou AAS)
- `formula_percentage`: `derivedKwp = (valor × factor) / divisor`, `Comissão = derivedKwp × pctTrans/100`
- `percentage_valor`: `Comissão = valor × pctTrans/100`
- `tiered_kwp`: mantém lógica actual com tiers

### Alterações no UI

**`src/components/settings/CommissionMatrixTab.tsx`**:

1. `TieredTableEditor` passa a renderizar-se **apenas** quando `method === 'tiered_kwp'`

2. Criar 3 novos componentes inline dentro do mesmo ficheiro:
   - `BasePlusKwpEditor` — 4 campos: Base Trans, Taxa Trans, Base AAS, Taxa AAS + labels "× kWp (auto)"
   - `FormulaPercentageEditor` — campos Factor, Divisor + campos % Trans e % AAS, com labels visuais da fórmula
   - `PercentageValorEditor` — 2 campos: % Trans e % AAS, com label "Valor (auto) ×"

3. O `ProductModal` renderiza o editor correcto conforme `rule.method`:
   ```
   if method === tiered_kwp → <TieredTableEditor>
   if method === base_plus_per_kwp → <BasePlusKwpEditor>
   if method === formula_percentage → <FormulaPercentageEditor>
   if method === percentage_valor → <PercentageValorEditor>
   ```

4. Cada editor lê/escreve nos campos novos do `CommissionRule` (não nos tiers)

### Ficheiros a alterar

| Ficheiro | O que muda |
|---|---|
| `src/hooks/useCommissionMatrix.ts` | Interface `CommissionRule` expandida, lógica `calculateCommission` usa campos directos em vez de tiers para 3 métodos |
| `src/components/settings/CommissionMatrixTab.tsx` | Tabela de escalões só para `tiered_kwp`; 3 novos editores de formulário inline para os outros métodos |

### Detalhe técnico

- Dados existentes (escalões Solar) não são afectados — `tiers` continua a funcionar para `tiered_kwp`
- Os novos campos (`baseTrans`, `ratePerKwpTrans`, `factor`, `divisor`, `pctTrans`, `pctAas`, etc.) são opcionais no tipo e guardados no mesmo JSON `commission_matrix` na organização
- Migração automática no `useEffect` do componente: se um produto tinha `base_plus_per_kwp` com tiers, os dados são ignorados (ficam a 0 nos novos campos)
- O `DecimalInput` existente é reutilizado nos novos editores

