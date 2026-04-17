

## Plano: Pausar Rafael Camilo do round-robin até 30/04/2026

### Contexto
- Empresa: **Escolha Inteligente** (`8cc9ec75-...`)
- Comercial: **Rafael Camilo** (`87a5e5fb-6bfb-4c3e-993a-a7c01a2a0fc5`)
- O round-robin em `submit-lead` (modo webhook **e** modo formulário) seleciona todos os membros activos não-admin via `organization_members` ordenados por `joined_at`. Hoje não há campo para excluir temporariamente um comercial.

### O que será feito

**1. Migração SQL — adicionar campo de pausa por comercial**
- Adicionar coluna `paused_until timestamptz` em `organization_members`.
- Significado: enquanto `paused_until > now()`, o membro é ignorado pelo round-robin e por qualquer atribuição automática. Após essa data, volta a entrar normalmente sem qualquer intervenção manual.
- Definir `paused_until = '2026-05-01 00:00:00+01'` (Lisboa) para o Rafael — assim recebe leads novamente a 1 de maio.

**2. Atualizar `submit-lead/index.ts`**
- Nas duas queries de round-robin (linhas ~106-114 e ~526-534), adicionar filtro:
  ```
  .or('paused_until.is.null,paused_until.lt.' + new Date().toISOString())
  ```
- Resultado: Rafael deixa de ser candidato a receber leads via webhook (Make/Zapier) e via formulários até 01/05/2026.

**3. Comportamento garantido**
- Leads já atribuídos ao Rafael **não são tocados** (continuam dele).
- Atribuição manual pelo admin continua a funcionar (a pausa só afeta automação).
- Os outros 5 comerciais continuam a rodar normalmente em round-robin.
- A 01/05 o Rafael volta automaticamente ao rodízio — zero intervenção.

### Ficheiros alterados
- Nova migração SQL: `ALTER TABLE organization_members ADD COLUMN paused_until timestamptz;` + `UPDATE` para o Rafael.
- `supabase/functions/submit-lead/index.ts`: 2 pontos do round-robin filtram membros pausados.

### Nota
Esta é uma alteração mínima e cirúrgica. Não toco em nada da UI agora. Se quiseres depois, posso adicionar um botão "Pausar comercial até..." na página de Equipa para gerir isto sem migração.

