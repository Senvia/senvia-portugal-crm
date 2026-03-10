

## Diagnóstico: Envio sequencial de emails

O problema é claro: a edge function `send-template-email` envia **um email de cada vez**, sequencialmente. Para cada destinatário:

1. Query ao `crm_clients` para buscar o `assigned_to` (se tem `clientId`)
2. Query ao `profiles` para buscar dados do vendedor
3. Chamada HTTP à API da Brevo
4. Insert no `email_sends`

Com 80 destinatários, são ~80 chamadas HTTP sequenciais à Brevo (~150-300ms cada) + queries à base de dados. Total estimado: **15-30 segundos**.

## Solução: Envio em paralelo por lotes (batches)

Alterar a edge function para processar destinatários em lotes paralelos de 10, reduzindo o tempo total em ~10x.

### Alterações

**1. `supabase/functions/send-template-email/index.ts`**
- Substituir o loop `for...of` sequencial por uma função de processamento em lotes
- Usar `Promise.all()` para enviar 10 emails em paralelo
- Pré-carregar dados de vendedores em batch (uma query) em vez de um query por destinatário

```text
Antes (sequencial):
  recipient 1 → wait → recipient 2 → wait → ... → recipient 80 → wait
  Total: ~80 × 200ms = 16s

Depois (lotes de 10):
  [1-10] em paralelo → wait → [11-20] em paralelo → ... → [71-80] em paralelo
  Total: ~8 × 200ms = 1.6s
```

**2. `supabase/functions/process-scheduled-campaigns/index.ts`**
- Aplicar a mesma lógica de lotes paralelos ao processamento de campanhas agendadas

### Resultado esperado
- Redução de tempo de envio de ~16s para ~2s numa campanha de 80 destinatários
- Sem alterações no frontend

