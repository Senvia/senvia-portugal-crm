
## Correção direta: deixar a Análise de Comissões **exatamente** com as colunas que você pediu

### Porque ainda está “igual”
Hoje a página ainda mantém o layout antigo (cards + accordion com colunas de valor/base/chargeback).  
Mesmo com parte do matching já ajustado, a UI principal **não foi trocada** para o formato final das 9 colunas.

## Plano de implementação

### 1) Trocar o layout principal da aba (remover estrutura antiga)
**Arquivo:** `src/components/finance/CommissionAnalysisTab.tsx`

- Remover da tabela principal as colunas antigas:
  - Valor a receber €
  - Base
  - Chargeback €
  - Chargebacks qtd
  - Diferencial €
  - Diferencial qtd
  - Match
- Remover exibição de valor na tabela de “não associados”.
- Manter “Comercial” apenas como agrupador/seção (não como coluna adicional da grade de dados).

### 2) Exibir somente as 9 colunas exigidas
**Arquivo:** `src/components/finance/CommissionAnalysisTab.tsx`

A grade detalhada ficará **somente** com:
1. Tipo de Comissão  
2. Nome da Empresa  
3. Tipo  
4. Linha de Contrato: Local de Consumo (CPE)  
5. DBL  
6. Linha de Contrato: Consumo anual  
7. Duração contrato (anos)  
8. Linha de Contrato: Data de inicio  
9. Linha de Contrato: Data Fim de Contrato  

Sem coluna de valor/comissão/match.

### 3) Parar de fazer matching local só por CPE na UI
**Arquivos:**  
- `src/hooks/useCommissionAnalysis.ts`  
- `src/components/finance/CommissionAnalysisTab.tsx`

- A UI vai usar o resultado do matching vindo do backend (que já considera CPE + cliente).
- Incluir no `select` dos items os campos de vínculo (`matched_proposal_cpe_id`, `matched_sale_id`) para montar linhas de forma determinística.
- Evitar o `matchFileToSystem()` atual baseado apenas em CPE no frontend.

### 4) Ajustar import para não bloquear por coluna de valor
**Arquivo:** `src/components/finance/ImportChargebacksDialog.tsx`

- Importação continua enviando linha completa (`raw_row` completo).
- `chargeback_amount` passa a ser opcional (fallback `0`) quando a coluna de valor não existir.
- Botão “Importar” habilita com CPE válido + linhas válidas (sem depender de coluna de valor).

### 5) Ajuste fino do matching no backend (compatibilidade de status)
**Arquivo:** nova migration em `supabase/migrations/...`

- Manter regra: CPE + nome do cliente aproximado.
- Incluir status de venda usados no sistema (ex.: `fulfilled`) junto dos já aceitos, para não perder match válido.

## Critérios de aceite (checklist final)

1. Na aba Análise de Comissões, a tabela mostra **apenas** as 9 colunas listadas acima.  
2. Não existe nenhuma coluna de valor/comissão/chargeback/diferencial/match na grade detalhada.  
3. Importação funciona mesmo sem coluna de valor no ficheiro.  
4. Matching usa CPE + cliente (aproximado), não CPE-only no frontend.  
5. Após importar, as linhas aparecem com os dados do ficheiro nessas 9 colunas.

## Arquivos que serão alterados
- `src/components/finance/CommissionAnalysisTab.tsx`
- `src/hooks/useCommissionAnalysis.ts`
- `src/components/finance/ImportChargebacksDialog.tsx`
- `supabase/migrations/<timestamp>_commission_analysis_match_and_status.sql`
