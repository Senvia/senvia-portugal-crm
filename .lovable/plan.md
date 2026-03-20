

## Abrir lista ao clicar nos cards CB e Comissões

### O que fazer

Ao clicar no card **Chargebacks (CB)**, abrir uma lista/modal com todas as linhas CB do ficheiro. Ao clicar no card **Comissões**, abrir lista equivalente com as linhas não-CB.

### Implementação

#### 1) Hook — expor listas detalhadas (`useCommissionAnalysis.ts`)
- No loop que já calcula `cbFileCount`/`comFileCount` (linha 459-471), acumular dois arrays:
  - `cbFileItems: FileDataRow[]`
  - `comFileItems: FileDataRow[]`
- Expor ambos no `summary` retornado

#### 2) UI — modal de lista (`CommissionAnalysisTab.tsx`)
- Adicionar estado `detailModal: 'cb' | 'com' | null`
- Tornar os cards CB e Comissões clicáveis (`cursor-pointer`, `onClick`)
- Renderizar um `Dialog` com tabela simples mostrando:
  - CPE, Nome da Empresa, Tipo Comissão, Valor a Receber
- Título dinâmico: "Chargebacks (CB)" ou "Comissões"

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts` — acumular `cbFileItems` e `comFileItems` no summary
- `src/components/finance/CommissionAnalysisTab.tsx` — estado do modal, cards clicáveis, dialog com tabela

