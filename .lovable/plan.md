

## Diagnóstico: Leads "desaparecem" dos comerciais ao mover para QUALIFICADO

### Investigação Realizada

Analisei a fundo o fluxo completo: RLS policies, query do `useLeads`, `handleStatusChange`, pipeline stages, e dados reais da Escolha Inteligente.

**Dados atuais:** As 4 leads em QUALIFICADO (key: `scheduled`) TÊM `assigned_to` correto — atribuídas à Bruna e ao Bernardo. Nenhuma lead tem `assigned_to = NULL`.

### Causa Provável

O problema mais provável está na **combinação de dois filtros redundantes** que, em certos cenários de timing, podem excluir leads:

1. **RLS Policy** (`Users read org leads v2`):
```sql
assigned_to = auth.uid() OR assigned_to IS NULL
```
Vendedores só veem leads atribuídas a si OU sem atribuição.

2. **Frontend** (`useLeads` hook, linha 27):
```typescript
if (effectiveUserIds) {
  query = query.in('assigned_to', effectiveUserIds);
}
```
Para `data_scope='own'`, filtra `assigned_to IN [user.id]`.

**O cenário problemático:** Se por qualquer razão o `assigned_to` ficar diferente do vendedor (ex: admin muda a atribuição, ou ocorre um bug no drag-and-drop que altera o campo), a lead desaparece instantaneamente do vendedor via realtime.

Além disso, o estágio QUALIFICADO tem key `scheduled`, que é o mesmo key usado nos templates de pipeline para "Agendado". Código em `useCalendarEvents.ts` (linha 120) faz:
```typescript
.update({ status: 'scheduled' })
```
Isto pode causar confusão se houver interações com calendário que alterem dados inesperadamente.

### Correção Proposta

#### 1. Tornar a query de leads mais resiliente (`useLeads.ts`)
- Para vendedores (`data_scope='own'`), usar um filtro OR que inclua tanto leads atribuídas ao utilizador COMO leads sem atribuição (para não perder leads recém-criadas)
- Trocar `.in('assigned_to', effectiveUserIds)` por um filtro `.or()` que cubra ambos os cenários

#### 2. Atualizar a RLS Policy para ser mais robusta
- Manter a política atual mas garantir que é consistente com o filtro frontend
- Sem alterações necessárias se o frontend for corrigido

#### 3. Remover o hardcode `status: 'scheduled'` em `useCalendarEvents.ts`
- Quando um evento de calendário é criado para uma lead, NÃO forçar o status para `scheduled` — deixar o status ser controlado pelo pipeline handler no `Leads.tsx`
- Isto previne que o status seja alterado silenciosamente fora do fluxo normal

### Ficheiros a Alterar
- `src/hooks/useLeads.ts` — melhorar filtro para incluir leads não atribuídas
- `src/hooks/useCalendarEvents.ts` — remover hardcode de `status: 'scheduled'`

