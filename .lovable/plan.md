

## Corrigir: Sincronização usa ID de CPE obsoleto — update não aplica

### Problema raiz
Verifiquei directamente na base de dados: **o DBL continua 50.017** — a atualização não aconteceu.

O `matched_proposal_cpe_id` guardado na tabela `commission_chargeback_items` aponta para `f7564406-...`, que **já não existe** na tabela `proposal_cpes`. O CPE real é `f1c6f110-...`.

Na linha 347 do `useCommissionAnalysis.ts`:
```ts
matchedProposalCpeId: matchedProposalCpeId ?? (match ? match.proposal_cpe_id : null)
```
O operador `??` só usa o fallback se o valor for `null`/`undefined`. Como `matchedProposalCpeId` é `f7564406-...` (não é null, só está obsoleto), o fallback com o ID correto do sistema **nunca é usado**.

O update executa contra um ID que não existe → 0 linhas afetadas → sem erro → toast diz "sucesso" falsamente.

### Solução

**Ficheiro: `src/hooks/useCommissionAnalysis.ts`**

1. **Linha 347** — Priorizar o ID do sistema (live match) sobre o ID do import:
   ```ts
   matchedProposalCpeId: (match ? match.proposal_cpe_id : null) || matchedProposalCpeId,
   ```
   Isto garante que se o sistema encontrou o CPE por `serial_number`, usa o ID real e atual.

2. **No `useSyncFileToSystem`** — Adicionar validação: verificar se o update afetou pelo menos 1 linha. Se não afetou, lançar erro informativo.

3. **Adicionar log** de quantos updates realmente afetaram linhas para debugging futuro.

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts` — priorizar ID do sistema + validação no sync

