

## Exibir dados completos do sistema na linha "Sistema" da tabela comparativa

### Problema
A linha "Sistema" mostra "—" para Nome da Empresa, CPE, Data Início e Data Fim. Esses dados existem no sistema mas não estão a ser passados para a tabela.

### Solução

#### 1) Enriquecer `CpeDetail` (`src/hooks/useLiveCommissions.ts`)

Adicionar campos ao interface e ao query:
- `client_name: string | null` — nome do cliente (de `crm_clients.name` ou `crm_clients.company`)
- `contrato_inicio: string | null` — de `proposal_cpes.contrato_inicio`
- `contrato_fim: string | null` — de `proposal_cpes.contrato_fim`

No select dos `proposal_cpes` (linha 153), adicionar `contrato_inicio, contrato_fim`.

No select dos `crm_clients` (linha 109), adicionar `name, company`.

Construir `clientNameMap` e passar para cada `CpeDetail` ao fazer push (linha 197).

#### 2) Enriquecer `ComparisonRow` (`src/hooks/useCommissionAnalysis.ts`)

Adicionar ao `ComparisonRow`:
- `systemClientName: string | null`
- `systemCpe: string | null`
- `systemDataInicio: string | null`
- `systemDataFim: string | null`

No `buildComparison`, preencher esses campos a partir do `CpeDetail` matched.

#### 3) Exibir na UI (`src/components/finance/CommissionAnalysisTab.tsx`)

Na linha "Sistema" (linhas 108-122), substituir os "—" pelos dados reais:
- Nome da Empresa → `row.systemClientName`
- CPE → `row.systemCpe`
- Data Início → `row.systemDataInicio`
- Data Fim → `row.systemDataFim`
- Tipo Comissão e Tipo mantêm "—" (não existem no sistema)

### Ficheiros alterados
- `src/hooks/useLiveCommissions.ts` — adicionar `client_name`, `contrato_inicio`, `contrato_fim` ao `CpeDetail`
- `src/hooks/useCommissionAnalysis.ts` — adicionar campos do sistema ao `ComparisonRow`
- `src/components/finance/CommissionAnalysisTab.tsx` — exibir dados do sistema na linha "Sistema"

