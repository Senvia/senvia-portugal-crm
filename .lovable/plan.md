

## Diagnostico: Leads nao chegam ao Facebook

### Problemas encontrados

**Bug 1 (CRITICO) — `submit-lead` crasha antes de enviar CAPI**

No ficheiro `supabase/functions/submit-lead/index.ts`, linha 310, o webhook payload referencia `transformedCustomData` — uma variavel que **nunca e definida**. A funcao `mapCustomDataToLabels` existe (linhas 230-253) mas nunca e chamada. Isto causa um `ReferenceError` que crasha a funcao DEPOIS de inserir o lead na DB mas ANTES de:
- Enviar webhooks ao n8n
- Enviar push notifications
- Enviar eventos CAPI ao Facebook

Resultado: leads sao guardados na base de dados, mas o Facebook nunca recebe o evento.

**Bug 2 — Login.tsx CAPI call sem autorizacao adequada**

A chamada CAPI no signup (linha 294) nao inclui header `Authorization`. Embora `verify_jwt = false`, a ausencia de qualquer header pode causar problemas dependendo do proxy. Alem disso, qualquer erro e silenciado por `.catch(() => {})`.

### Solucao

**Ficheiro 1: `supabase/functions/submit-lead/index.ts`**
- Adicionar a chamada a `mapCustomDataToLabels` antes de construir o payload:
  ```typescript
  const transformedCustomData = mapCustomDataToLabels(
    body.custom_data || null,
    formSettings.form_settings as any
  );
  ```
- Inserir esta linha imediatamente antes da construcao do `webhookPayload` (antes da linha 276).

**Ficheiro 2: `src/pages/Login.tsx`**
- Adicionar header `Authorization` com a anon key nas chamadas CAPI para garantir que passam pelo proxy correctamente:
  ```typescript
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  },
  ```
- Aplicar nos dois blocos de CAPI call (linhas ~294 e ~349).

### Impacto

A correcao do Bug 1 resolve o problema principal — todos os leads de formularios publicos voltarao a disparar eventos CAPI para o Facebook. A correcao do Bug 2 garante que os eventos de signup tambem chegam.

