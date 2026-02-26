

## Plano: Secção de configuração de derivação por tier

### Contexto
O utilizador quer que acima da tabela de bandas exista uma secção onde se configura, para cada tier (300 MWh, 301-600 MWh, 601+ MWh), **como** os valores são calculados. Cada tier pode:
- Usar uma **operação manual** (÷ ou ×) com um valor numérico (ex: ÷1.33)
- Ou usar uma **coluna como referência** (ex: usar a coluna 301-600 como base)

Quando o utilizador edita a coluna de referência, as outras são recalculadas conforme a regra definida.

### Modelo de dados

Adicionar `tierRules` ao `EnergyCommissionConfig`:

```typescript
interface TierDerivationRule {
  source: 'manual' | 'from_low' | 'from_mid' | 'from_high'; // qual coluna é referência
  operation: 'multiply' | 'divide';  // × ou ÷
  value: number;                      // ex: 1.33, 1.5
}

interface EnergyCommissionConfig {
  bands: EnergyMarginBand[];
  tierRules?: {
    low: TierDerivationRule;   // 300 MWh
    mid: TierDerivationRule;   // 301-600 MWh
    high: TierDerivationRule;  // 601+ MWh
  };
}
```

Defaults:
- **300 MWh**: source=`from_mid`, operation=`divide`, value=`1.33`
- **301-600 MWh**: source=`manual` (é a referência, não deriva de nenhuma)
- **601+ MWh**: source=`from_mid`, operation=`multiply`, value=`1.5`

Se `source === 'manual'` → a coluna não é auto-derivada, o utilizador edita directamente.

### Alterações

**Ficheiro:** `src/hooks/useCommissionMatrix.ts`
- Adicionar `TierDerivationRule` e o campo `tierRules` ao `EnergyCommissionConfig`
- Exportar defaults para as regras

**Ficheiro:** `src/components/settings/CommissionMatrixTab.tsx`
1. **Nova secção acima da tabela** — 3 cards/rows (um por tier) com:
   - Label do tier (ex: "300 MWh")
   - Select: "Manual" ou "Derivar de coluna" (300 MWh / 301-600 MWh / 601+ MWh)
   - Se derivar: Select operação (× ou ÷) + Input numérico para o valor
2. **Atualizar `updateBand`** — usar as `tierRules` do config para decidir quais colunas recalcular e com que fórmula, em vez dos valores hardcoded ÷1.33 e ×1.5
3. **Lógica de derivação genérica**: quando um campo de um tier "fonte" é editado, recalcular todos os tiers que apontam para ele conforme a operação/valor configurados

### UI da secção de regras (acima da tabela)

```text
┌─────────────────────────────────────────────────────┐
│  Regras de Derivação                                │
├──────────┬──────────────────┬─────┬─────────────────┤
│ 300 MWh  │ [Derivar de ▼]   │ [÷] │ [1.33]         │
│          │  301-600 MWh     │     │                 │
├──────────┼──────────────────┼─────┼─────────────────┤
│ 301-600  │ [Manual ▼]       │  —  │  —              │
├──────────┼──────────────────┼─────┼─────────────────┤
│ 601+ MWh │ [Derivar de ▼]   │ [×] │ [1.5]          │
│          │  301-600 MWh     │     │                 │
└──────────┴──────────────────┴─────┴─────────────────┘
```

### Ficheiros afetados
| Ficheiro | Ação |
|---|---|
| `src/hooks/useCommissionMatrix.ts` | Adicionar tipos `TierDerivationRule`, campo `tierRules` |
| `src/components/settings/CommissionMatrixTab.tsx` | Secção de regras + lógica de derivação genérica |

