

## Problema: Compromisso guardado mas não aparece

### Causa Raiz

Os dados **estão guardados** correctamente na base de dados (confirmado via network — `total_nifs: 2, total_energia_mwh: 3000`, etc.). O problema é na **renderização do painel**.

O `CommitmentPanel` faz:
1. Busca a lista de membros da equipa via `useTeamMembers()` (edge function `get-team-members`)
2. Para cada membro, procura o compromisso correspondente
3. O teu utilizador (super_admin) **não está na tabela `organization_members`** da Perfect2Gether — apenas navega para lá via o switcher de organizações
4. Como não aparece na lista de `members`, a sua linha **nunca é renderizada**, mesmo tendo dados guardados

### Correção

**`CommitmentPanel.tsx`** — Garantir que o utilizador actual aparece sempre na tabela, mesmo que não esteja na lista de `organization_members`:

1. Após construir `rows` a partir de `members`, verificar se o utilizador actual já está incluído
2. Se não estiver (caso super_admin), adicionar uma linha com os dados do compromisso do próprio utilizador
3. Para o nome, usar `profile?.full_name` do AuthContext como fallback

Alteração isolada a **um único ficheiro** (`CommitmentPanel.tsx`), sem migrações SQL.

