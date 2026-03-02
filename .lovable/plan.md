

## Correções na tabela de comissões

### Bug 1 — Label errado para `sem_volume`
Nos dois ficheiros (`CommissionsTab.tsx` linha 19 e `useLiveCommissions.ts` linha 17), o label está como `'Sem Volume'` mas deveria ser `'Ang. sem Volume'` para corresponder ao nome correto do tipo de negociação.

### Bug 2 — Coluna "Serviços" não mostra "Energia"
Na tabela expandida, a coluna "Serviços" só mostra os produtos de `servicos_produtos` (Solar, Baterias, etc.). Quando a proposta é do tipo `energia`, deveria também aparecer uma badge "Energia" com o tipo de negociação (ex: "Energia - Angariação").

### Alterações

**`src/components/finance/CommissionsTab.tsx`**:
1. Linha 19: mudar `'Sem Volume'` → `'Ang. sem Volume'`
2. Na coluna "Serviços" (linhas ~213-220): quando `proposal_type === 'energia'`, adicionar badge "Energia" antes dos serviços existentes

**`src/hooks/useLiveCommissions.ts`**:
1. Linha 17: mudar label `'Sem Volume'` → `'Ang. sem Volume'`
2. Incluir `proposal_type` nos dados passados ao `CpeDetail` para que o componente saiba se é energia ou serviços

**`CpeDetail` interface**: adicionar campo `proposal_type: string`

