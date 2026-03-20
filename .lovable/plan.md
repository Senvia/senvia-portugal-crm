
## Correção real da Análise de Comissões (CPE + Cliente, sem colunas de valor)

### Diagnóstico (o que está errado hoje)
1. **Dados importados ainda estão incompletos no banco**: o último import salvo tem `raw_row` só com `cpe` e `chargeback_amount`, então as colunas do ficheiro aparecem vazias.
2. **Matching atual ainda é só por CPE** (não valida cliente), tanto no SQL de import quanto no render da tabela.
3. **Tabela detalhada mostra colunas que você não quer** (valor/comissão), fugindo do que pediu.
4. **Import antigo precisa ser descartado** para refletir o novo formato completo.

---

### Plano de implementação

#### 1) Ajustar o matching no backend para **CPE + cliente (aproximado)** e só venda concluída
**Arquivo:** nova migration SQL (update da função `import_commission_chargebacks`)

- Atualizar a função para:
  - continuar lendo `cpe` da coluna `Linha de Contrato: Local de Consumo`;
  - extrair `Nome da Empresa` do `raw_row`;
  - buscar apenas registros com **venda concluída/entregue** (não proposta solta);
  - aplicar match por:
    - `normalized_cpe` igual
    - + nome do cliente com **match aproximado** (normalizado sem acento/caixa/pontuação, com score de similaridade simples).
- Se CPE bater e cliente não bater suficientemente:
  - marcar como não associado com motivo tipo `"Cliente não confere"`.
- Isso garante que o vínculo não seja falso-positivo só por CPE.

#### 2) Garantir persistência da linha completa no import
**Arquivo:** `src/components/finance/ImportChargebacksDialog.tsx`

- Confirmar payload com linha completa (`...row`) + `cpe` + `chargeback_amount` (já começou, mas vamos validar ponta a ponta).
- Adicionar validação defensiva antes do envio: se a linha tiver só 2 chaves, bloquear import com erro claro (evita regressão silenciosa).

#### 3) Reestruturar a tabela da Análise de Comissões para mostrar **somente** as colunas pedidas
**Arquivo:** `src/components/finance/CommissionAnalysisTab.tsx`

- Remover da sub-tabela colunas de valor/comissão.
- Exibir no detalhe apenas:
  - Tipo de Comissão
  - Nome da Empresa
  - Tipo
  - Linha de Contrato: Local de Consumo (CPE)
  - DBL
  - Linha de Contrato: Consumo anual
  - Duração contrato (anos)
  - Linha de Contrato: Data de inicio
  - Linha de Contrato: Data Fim de Contrato
- Manter a visão “sistema vs ficheiro” baseada no matching, sem expor valores monetários na grade detalhada.

#### 4) Normalizar leitura das colunas do ficheiro para evitar “—”
**Arquivo:** `src/hooks/useCommissionAnalysis.ts`

- Fortalecer `parseRawRow()` para leitura tolerante de variações de header (acentos, maiúsculas, espaços extras).
- Isso evita que uma pequena variação do Excel quebre a exibição dos campos.

#### 5) Limpar dados antigos e reimportar
- Apagar imports/items antigos dessa org (dados incompletos).
- Reimportar o ficheiro para popular `raw_row` completo.
- Sem isso, a tela continuará “igual” mesmo com código corrigido.

---

### Validação (obrigatória)
1. Importar o ficheiro novamente.
2. Conferir que `raw_row` no banco contém várias chaves (não só `cpe` e `chargeback_amount`).
3. Na Análise de Comissões:
   - conferir que as linhas aparecem com as 9 colunas pedidas;
   - conferir que match exige CPE + cliente aproximado;
   - conferir que casos de cliente divergente vão para não associados com motivo.
4. Confirmar que não há colunas de valor na tabela detalhada.

---

### Arquivos que serão alterados
- `supabase/migrations/<nova>_update_import_commission_chargebacks.sql`
- `src/components/finance/ImportChargebacksDialog.tsx`
- `src/hooks/useCommissionAnalysis.ts`
- `src/components/finance/CommissionAnalysisTab.tsx`
