
## Correção proposta (comportamento que você descreveu)

### Diagnóstico real
1. **Ainda aparecem 2 linhas** porque a tabela foi desenhada para sempre mostrar “Ficheiro” + “Sistema” por registro, mesmo depois de sincronizar.  
2. **Duração continua diferente** porque hoje o sistema salva `duracao_contrato` como inteiro (`2`) enquanto o ficheiro/datas representam valor fracionado (`2.046...`).  
3. Como a comparação usa esse valor bruto, a discrepância nunca “zera” nesse caso.

## O que vou implementar

### 1) Tornar duração coerente com as datas (fonte de verdade)
**Arquivo:** `src/hooks/useCommissionAnalysis.ts`

- Criar helper para calcular duração por datas:  
  `duracao = (dataFim - dataInicio) / 365`
- No parsing do ficheiro, gerar uma **duração canónica**:
  - Prioridade: calcular via `dataInicio` + `dataFim` do ficheiro
  - Fallback: campo “Duração contrato (anos)” do ficheiro
- Na comparação, usar essa duração canónica (não só string bruta do Excel).

### 2) Sincronizar também datas e duração derivada (não só DBL/Consumo)
**Arquivo:** `src/hooks/useCommissionAnalysis.ts`

- Expandir `SyncFileToSystemItem` para incluir `contratoInicio` e `contratoFim`.
- No botão sincronizar, enviar para atualização:
  - `dbl`
  - `consumo_anual`
  - `contrato_inicio`
  - `contrato_fim`
  - `duracao_contrato` calculada a partir das datas (quando existirem)

### 3) Ajuste de estrutura da base para não perder casas decimais
**Banco (migração):**
- Alterar `proposal_cpes.duracao_contrato` de `integer` para `numeric` (ex.: `numeric(12,6)`).
- Backfill opcional de consistência:
  - Recalcular `duracao_contrato` para registros com `contrato_inicio` e `contrato_fim`.

Isso elimina a situação “datas iguais, duração diferente”.

### 4) UI: quando não houver discrepância, virar “uma linha só”
**Arquivo:** `src/components/finance/CommissionAnalysisTab.tsx`

- Manter 2 linhas **apenas** quando `hasAnyDiscrepancy === true`.
- Quando não houver discrepância, renderizar **linha única** com badge:
  - **“Atualizado pelo ficheiro”**
- Assim, após sincronizar com sucesso e sem diferenças, o item deixa de aparecer duplicado.

## Resultado esperado
- Se datas de ficheiro e sistema forem iguais, a duração passa a bater.
- Após sincronização correta, o item deixa de mostrar comparação dupla e aparece como **“Atualizado pelo ficheiro”** em linha única.
- A análise continua mostrando 2 linhas somente para casos realmente discrepantes.
