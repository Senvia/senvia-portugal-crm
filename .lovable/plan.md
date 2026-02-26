

## Plano: Sistema de Comissões EE & Gás

### Resumo do Entendimento

A tabela de comissões de Energia funciona assim:
- **Bandas de Margem**: escalões progressivos baseados na Margem DBL Total do CPE (< 0€, > 0€, > 500€, > 1000€, > 2000€, > 5000€, > 10.000€, > 20.000€)
- **3 Faixas de Volume** (MWh ativos no mês): 0–300, 301–600, 601+
- **Referência** = coluna 301–600 (usada em Propostas e Vendas)
- As outras faixas derivam: `0-300 = referência ÷ 1.33` e `601+ = referência × 1.5`
- **Fórmula por CPE**: `Comissão = Valor + (Margem_Total − Limite_Banda) × Ponderador`
- Quando a venda está ativa, a comissão é recalculada mensalmente com base no volume total de MWh ativos

O cliente pode editar esta tabela na **Matriz de Comissões** (Settings), ao lado dos produtos de Serviços existentes.

---

### Alterações Técnicas

#### 1. Novos tipos para EE & Gás
**Ficheiro:** `src/hooks/useCommissionMatrix.ts`

Adicionar:
```typescript
export interface EnergyMarginBand {
  marginMin: number;      // Limite inferior da banda (0, 500, 1000...)
  ponderador: number;     // % referência (ex: 4.00)
  valor: number;          // € referência (ex: 40)
}

export interface EnergyCommissionConfig {
  bands: EnergyMarginBand[];         // Tabela editável (coluna referência 301-600)
  volumeMultipliers: {               // Derivação automática
    low: number;   // divisor para 0-300 MWh (default: 1.33)
    mid: number;   // referência 301-600 (sempre 1)
    high: number;  // multiplicador 601+ (default: 1.5)
  };
}
```

Armazenado em `commission_matrix.ee_gas` na organização.

#### 2. Função de cálculo de comissão Energia
**Ficheiro:** `src/hooks/useCommissionMatrix.ts`

Nova função `calculateEnergyCommission(margem, volumeTier)`:
1. Encontra a banda onde `margem >= marginMin` (a mais alta aplicável)
2. Obtém `ponderador` e `valor` da referência
3. Aplica multiplicador de volume (÷1.33, ×1, ×1.5) ao ponderador e valor
4. `Comissão = valorAjustado + (margem − marginMin) × (ponderadorAjustado / 100)`

Para propostas/vendas: usa sempre `mid` (referência directa).

#### 3. Editor visual na Matriz de Comissões
**Ficheiro:** `src/components/settings/CommissionMatrixTab.tsx`

- Novo card "EE & Gás" com ícone `Zap` no grid de produtos
- Modal dedicado com tabela editável:
  - Colunas: **Banda de Margem**, **Ponderador (%)**, **Valor (€)** — apenas a referência (301-600)
  - Preview automático das 3 colunas derivadas (read-only)
  - Campos editáveis para os multiplicadores de volume (default 1.33 / 1 / 1.5)
  - Botões adicionar/remover bandas + importar Excel
- Guardar em `commission_matrix.ee_gas`

#### 4. Auto-cálculo na Proposta (por CPE)
**Ficheiro:** `src/components/proposals/ProposalCpeSelector.tsx`

- Quando a config EE & Gás existe na matriz, o campo **Comissão** do CPE passa a ser auto-calculado
- Input: Margem (já calculada: `consumo × duração × DBL / 1000`)
- Usa `calculateEnergyCommission(margem, 'mid')` para obter a comissão
- Campo comissão fica `readOnly` com label "(Auto)" quando configurado
- Soma total das comissões CPE = comissão da proposta

#### 5. Recálculo evolutivo nas Vendas Ativas (futuro)
- Quando vendas passam a estado ativo, o volume total de MWh dos CPEs ativos nesse mês determina a faixa
- Este cálculo mensal pode ser feito via cron/edge function (fase 2)
- Por agora: preparar a estrutura para suportar os 3 tiers de volume

---

### Ficheiros Afetados
| Ficheiro | Ação |
|---|---|
| `src/hooks/useCommissionMatrix.ts` | Novos tipos + `calculateEnergyCommission()` |
| `src/components/settings/CommissionMatrixTab.tsx` | Novo card + modal editor EE & Gás |
| `src/components/proposals/ProposalCpeSelector.tsx` | Auto-cálculo comissão por CPE |
| `src/components/proposals/CreateProposalModal.tsx` | Integrar auto-cálculo |
| `src/components/proposals/EditProposalModal.tsx` | Integrar auto-cálculo |

Nenhuma migration SQL necessária — os dados ficam no campo JSONB `commission_matrix` da tabela `organizations`.

