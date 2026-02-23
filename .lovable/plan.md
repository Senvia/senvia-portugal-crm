

# Corrigir Discrepancia nos Dias de Trial

## Problema
O banner no painel do cliente mostra "14 dias restantes" enquanto a tabela do Super Admin mostra "13d restantes" para a mesma organizacao. A causa e a diferenca de arredondamento:

- **Edge function (check-subscription)**: usa `Math.ceil` -- arredonda para cima
- **Super Admin (OrganizationsTable)**: usa `differenceInDays` do date-fns -- trunca (arredonda para baixo)

Com 13 dias e 18 horas restantes, um mostra 14, o outro mostra 13.

## Solucao
Uniformizar ambos para usarem `Math.ceil`, que e mais correto do ponto de vista do utilizador (enquanto houver horas restantes no dia, conta como 1 dia).

## Alteracao

### Ficheiro: `src/components/system-admin/OrganizationsTable.tsx`

Linha 134, substituir:
```typescript
const daysLeft = trialEnd ? differenceInDays(trialEnd, now) : null;
```

Por:
```typescript
const diffMs = trialEnd ? trialEnd.getTime() - now.getTime() : null;
const daysLeft = diffMs !== null ? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : null;
```

Isto alinha o calculo com o que a edge function ja faz, garantindo que ambos os paineis mostram o mesmo numero.

### Impacto
- Apenas 1 ficheiro alterado
- Sem alteracoes na base de dados ou edge functions
- O import de `differenceInDays` do date-fns pode ser removido se nao for usado noutro local do ficheiro

