

## Corrigir toast "CPEs atualizados" em propostas nao-telecom

### Problema

Ao editar uma proposta num nicho generico (nao-telecom), aparece a mensagem "CPEs atualizados" e a atualizacao demora mais do que devia. Isto acontece porque:

1. O estado `proposalType` e inicializado como `'energia'` (linha 61 do `EditProposalModal.tsx`)
2. No `handleSubmit`, a condicao para atualizar CPEs e apenas `proposalType === 'energia'` (linha 263), sem verificar se e telecom
3. Resultado: mesmo em nichos genericos, o sistema tenta atualizar CPEs (com array vazio), executa queries desnecessarias na base de dados e mostra o toast errado

### Solucao

Adicionar a verificacao `isTelecom` a condicao no `handleSubmit` para que CPEs so sejam atualizados em organizacoes telecom.

### Detalhes tecnicos

**Ficheiro: `src/components/proposals/EditProposalModal.tsx`**

- Linha 263: alterar `if (proposalType === 'energia')` para `if (isTelecom && proposalType === 'energia')`

Isto garante que:
- Nichos genericos nunca executam a logica de CPEs
- A atualizacao e mais rapida (sem queries desnecessarias)
- O toast "CPEs atualizados" nunca aparece fora do contexto telecom

| Ficheiro | Alteracao |
|---|---|
| `src/components/proposals/EditProposalModal.tsx` | Adicionar `isTelecom &&` na condicao de atualizacao de CPEs (linha 263) |

