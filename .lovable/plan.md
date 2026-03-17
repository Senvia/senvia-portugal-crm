
Objetivo

Fazer com que a opção “Activar automação” só apareça quando a organização tiver a automação de WhatsApp realmente ativa/configurada.

O que confirmei no código

- A checkbox está hoje sempre visível em `src/components/leads/AddLeadModal.tsx`.
- O texto atual é exatamente:
  - “Activar automação”
  - “Enviar mensagem automática de WhatsApp e notificar equipa.”
- A organização já guarda configuração e estado da integração:
  - credenciais: `whatsapp_base_url`, `whatsapp_instance`, `whatsapp_api_key`
  - toggle global: `integrations_enabled.whatsapp`
- A área de Definições já trata WhatsApp como integração configurável em:
  - `src/pages/Settings.tsx`
  - `src/components/settings/IntegrationsContent.tsx`
- A criação manual de leads usa `useCreateLead`, que grava `automation_enabled` no lead.
- O envio/notificação real de novos leads hoje acontece no backend `supabase/functions/submit-lead/index.ts` para leads vindos de formulários/webhooks, com notificação da equipa via push/email.

Abordagem

1. Definir a regra de visibilidade
- Mostrar a secção “Activar automação” apenas quando a organização tiver:
  - `integrations_enabled.whatsapp !== false`
  - e `whatsapp_base_url`, `whatsapp_instance` e `whatsapp_api_key` preenchidos
- Isto evita mostrar a opção quando a integração está desligada ou incompleta.

2. Aplicar no modal manual de lead
- Em `src/components/leads/AddLeadModal.tsx`:
  - ler `organization?.integrations_enabled`
  - calcular um boolean do tipo `hasActiveWhatsappAutomation`
  - renderizar o bloco da checkbox apenas quando esse boolean for `true`

3. Garantir defaults coerentes
- Se a automação não estiver ativa na organização:
  - não mostrar a checkbox
  - opcionalmente forçar `automation_enabled` para `false` no submit/manual reset para evitar gravar “true” escondido
- Se estiver ativa:
  - manter comportamento atual com checkbox disponível

4. Verificar outros pontos semelhantes
- Fazer uma varredura por:
  - “Activar automação”
  - “Enviar mensagem automática de WhatsApp”
  - usos de `automation_enabled` ligados à UI de leads
- O objetivo é apanhar outros formulários/modais onde esta opção também possa estar visível indevidamente.

5. Preservar o resto do fluxo
- Não mexer nas definições de integração do WhatsApp
- Não mexer na lógica de notificações da equipa já existente
- Não alterar automações de email/templates, porque são um sistema separado

Resultado esperado

- A opção só aparece para organizações com WhatsApp ativo/configurado.
- Organizações sem essa integração deixam de ver uma opção que não funciona.
- A experiência fica mais clara e alinhada com o estado real da organização.

Detalhe técnico

Regra recomendada:
```text
hasActiveWhatsappAutomation =
  integrations_enabled.whatsapp !== false
  AND whatsapp_base_url preenchido
  AND whatsapp_instance preenchido
  AND whatsapp_api_key preenchido
```

Ficheiros a ajustar
- `src/components/leads/AddLeadModal.tsx`

Verificação após implementação
- Org com WhatsApp ativo/configurado: a checkbox deve aparecer
- Org sem credenciais ou com toggle desligado: a checkbox não deve aparecer
- Criar lead manual continua a funcionar nos dois casos
