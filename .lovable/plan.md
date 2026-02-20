

## Prevenir leads orfaos no futuro

### Situacao Atual

Neste momento nao existem leads orfaos na base de dados. A correcao SQL anterior funcionou. No entanto, identifiquei um risco que pode causar o problema novamente:

### Risco: Edge Function `update-lead` com status hardcoded

O ficheiro `supabase/functions/update-lead/index.ts` (usado pelo n8n) tem uma lista fixa de status validos:

```
const VALID_STATUSES = ['new', 'contacted', 'scheduled', 'won', 'lost']
```

Se o n8n tentar atualizar um lead da Perfect2Gether para `'perdido'`, a edge function vai **rejeitar** o pedido porque `'perdido'` nao esta na lista. Isto pode forcar o uso de `'lost'` que depois nao corresponde a nenhuma etapa da pipeline Telecom.

### Alteracoes

**1. Edge Function `update-lead/index.ts`**
- Remover a validacao hardcoded de status
- Substituir por uma consulta a tabela `pipeline_stages` para validar que o status enviado e uma key valida para aquela organizacao

Em vez de:
```typescript
const VALID_STATUSES = ['new', 'contacted', 'scheduled', 'won', 'lost'];
if (!VALID_STATUSES.includes(body.updates.status)) { ... }
```

Fazer:
```typescript
const { data: validStages } = await supabase
  .from('pipeline_stages')
  .select('key')
  .eq('organization_id', body.organization_id);
const validKeys = validStages?.map(s => s.key) || [];
if (!validKeys.includes(body.updates.status)) { ... }
```

**2. Verificacao final**
- Confirmar que nao ha mais nenhum ponto no sistema que escreva status hardcoded para organizacoes com pipelines personalizadas

### Nota

Se estiveres a ver a coluna "Sem Etapa" neste momento, faz refresh a pagina -- pode ser cache do browser. A base de dados ja esta limpa.

