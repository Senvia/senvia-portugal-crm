

## Notificacao por Email: Novo Lead Criado

### Objetivo
Quando um novo lead e criado (via formulario publico), enviar email automatico via Brevo para:
1. **Admins** da organizacao (todos os membros com role `admin`)
2. **Comercial atribuido** (se o lead foi auto-assigned via round-robin ou form config)

### Arquitetura

A logica sera adicionada diretamente na edge function `submit-lead/index.ts`, no mesmo bloco onde ja dispara push notifications e webhooks. Reutiliza o padrao existente de Brevo (igual a `notify-finance-request`).

### Alteracoes

**1. `supabase/functions/submit-lead/index.ts`**

Apos a secao de push notifications (~linha 404), adicionar um novo bloco non-blocking:

- Buscar `brevo_api_key` e `brevo_sender_email` da organizacao (ja disponivel no objeto `org` — basta adicionar estes campos ao `.select()` inicial na linha ~109)
- Se Brevo estiver configurado:
  - Buscar todos os `organization_members` com `role = 'admin'` e `is_active = true`, join com `profiles` para obter o email
  - Se `autoAssignedTo` existe, buscar o email do comercial atribuido via `profiles`
  - Construir lista unica de destinatarios (sem duplicados)
  - Enviar email via Brevo API (`api.brevo.com/v3/smtp/email`) com:
    - **Assunto**: `🚀 Novo Lead: {nome} - {source}`
    - **Corpo HTML**: Info basica do lead (nome, telefone, email, fonte, formulario) + link direto para `/leads`
  - Fire-and-forget (non-blocking, como os webhooks)

### Detalhes tecnicos

- O `.select()` na linha ~109 ja busca dados da org — adicionar `brevo_api_key, brevo_sender_email` ao select
- Emails dos admins: query `organization_members` WHERE `role = 'admin'` JOIN `profiles` ON `user_id = id`
- Email do comercial: query `profiles` WHERE `id = autoAssignedTo`
- Deduplicar: se o comercial tambem e admin, enviar apenas 1 email
- Fallback: se Brevo nao configurado, skip silenciosamente (log warning)

### Sem alteracoes no frontend
Nao e necessaria nenhuma configuracao adicional — basta a organizacao ter Brevo configurado (campo `brevo_api_key` e `brevo_sender_email`). O comportamento e automatico.

### Resumo
1 ficheiro alterado: `supabase/functions/submit-lead/index.ts`
- Adicionar `brevo_api_key, brevo_sender_email` ao select da org
- Novo bloco apos push notifications para enviar email via Brevo aos admins + comercial atribuido

