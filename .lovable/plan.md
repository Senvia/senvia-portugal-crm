

## Diagnóstico

A Escolha Inteligente usa o **modo webhook** (Make.com) para receber leads. O problema está claro no código:

### Modo Webhook (`handleWebhookMode`, linhas 26-217)
- Envia push notifications
- Envia webhooks
- **NÃO envia email de notificação** — falta completamente o bloco de email Brevo

### Modo Formulário (linhas 666-764)
- Envia email para todos os admins + comercial atribuído
- Funciona corretamente

**Resultado para Escolha Inteligente**: nenhum email é enviado quando um lead chega via Make.com, nem para o admin nem para o comercial atribuído.

Quanto à "comercial que recebeu todos os emails" — se essa comercial tem role `admin` na organização, recebe todos os emails do modo formulário (se testaram por formulário). Mas via webhook, ninguém recebe.

---

## Plano de Correção

### Ficheiro: `supabase/functions/submit-lead/index.ts`

Adicionar o bloco de notificação por email ao `handleWebhookMode`, após a criação do lead (depois da linha 163), com a mesma lógica do modo formulário:

1. Verificar se a org tem `brevo_api_key` (ou usar fallback Senvia global)
2. Buscar membros com role `admin` da organização
3. Adicionar o `autoAssignedTo` à lista se não for admin
4. Buscar emails dos perfis
5. Enviar email via Brevo com os dados do lead

A lógica é idêntica ao bloco existente nas linhas 666-764, adaptada para usar as variáveis do webhook mode (`org`, `lead`, `autoAssignedTo`).

### Impacto
- 1 ficheiro alterado + redeploy da edge function
- Admins recebem email de TODOS os leads (como esperado)
- Comercial atribuído recebe email apenas do lead que lhe foi atribuído
- Sem impacto em organizações que usam formulário (lógica já existente mantém-se)

