

## Corrigir: página de Análise de Comissões mostra dados do sistema sem ficheiro importado

### Problema
1. As tabelas `commission_chargeback_items` e `commission_chargeback_imports` estão **vazias** (dados foram apagados anteriormente).
2. O "Nuno" que aparece vem do `useLiveCommissions` — vendas entregues no mês selecionado — não do ficheiro.
3. A página mistura dados do sistema (vendas entregues) com dados do ficheiro, mostrando comerciais mesmo sem ficheiro importado.

### Solução

**Ficheiro: `src/hooks/useCommissionAnalysis.ts`**

- Alterar a lógica de construção da lista de comerciais:
  - **Só mostrar comerciais que tenham `fileData.length > 0`** (dados do ficheiro importado)
  - Remover comerciais que vêm apenas do `useLiveCommissions` sem dados de ficheiro associados
  - Isto garante que a página fica vazia (com mensagem "Sem dados") até o utilizador importar o ficheiro

**Ficheiro: `src/components/finance/CommissionAnalysisTab.tsx`**

- Ajustar a mensagem do estado vazio para orientar o utilizador a importar o ficheiro:
  - "Importe um ficheiro para ver a análise de comissões."

### Resultado
- Sem ficheiro importado → página mostra "Sem dados, importe um ficheiro"
- Com ficheiro importado → página mostra os comerciais com os dados do ficheiro (9 colunas)
- O utilizador precisa de **reimportar o ficheiro** para ver dados

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts`
- `src/components/finance/CommissionAnalysisTab.tsx`

