

## Mostrar dados do ficheiro vs dados do sistema lado a lado (com discrepâncias)

### O que muda

Hoje a tabela mostra apenas os dados do ficheiro importado. Vamos adicionar, para cada linha do ficheiro que fez match com um CPE do sistema, os valores correspondentes do sistema — permitindo comparar e identificar discrepâncias.

### Implementação

#### 1) Buscar campos em falta do sistema (`src/hooks/useLiveCommissions.ts`)

O `select` dos `proposal_cpes` (linha 152) só traz `consumo_anual, margem, comissao, serial_number`. Adicionar `dbl` e `duracao_contrato` para ter os dados necessários à comparação.

Atualizar a interface `CpeDetail` para incluir `dbl` e `duracao_contrato`.

#### 2) Cruzar ficheiro com sistema no hook (`src/hooks/useCommissionAnalysis.ts`)

Criar uma nova interface `ComparisonRow` com:
- Dados do ficheiro (`FileDataRow`)
- Dados do sistema (CPE match): `consumoAnualSistema`, `dblSistema`, `duracaoSistema`
- Flags de discrepância: `hasConsumoDiscrepancy`, `hasDblDiscrepancy`, `hasDuracaoDiscrepancy`

Para cada `FileDataRow` de um comercial, fazer match pelo CPE (`serial_number`) com os `cpes` do sistema desse comercial. Comparar valores numéricos e marcar discrepâncias.

Adicionar `comparisonData: ComparisonRow[]` ao `CommissionAnalysisCommercial`.

#### 3) Redesenhar a tabela na UI (`src/components/finance/CommissionAnalysisTab.tsx`)

Substituir `FileDataTable` por uma tabela comparativa com duas linhas por CPE:
- **Linha 1 (Ficheiro)**: valores do ficheiro — label "Ficheiro" à esquerda
- **Linha 2 (Sistema)**: valores do sistema — label "Sistema" à esquerda

Células com discrepância destacadas com fundo vermelho/laranja claro para identificação rápida.

Colunas comparáveis: **DBL**, **Consumo anual**, **Duração (anos)**. As restantes (Tipo Comissão, Empresa, Tipo, CPE, Data Início, Data Fim) mostram apenas o valor do ficheiro.

### Ficheiros alterados
- `src/hooks/useLiveCommissions.ts` — adicionar `dbl`, `duracao_contrato` ao select e à interface
- `src/hooks/useCommissionAnalysis.ts` — criar `ComparisonRow`, cruzar ficheiro com sistema
- `src/components/finance/CommissionAnalysisTab.tsx` — tabela comparativa com destaque de discrepâncias

