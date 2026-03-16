
Diagnóstico rápido

- O problema não foi o agendador “não correr”. Ele correu normalmente:
  - a rotina `process-scheduled-campaigns` foi chamada com `200`
  - a campanha `Formulários Meta` mudou para `failed` exatamente às `09:00:01`
- Também não parece ser falta de configuração de envio:
  - a organização tem remetente configurado
  - a chave de envio existe

O que encontrei

- As campanhas falhadas mais recentes estão assim:
  - `Formulários Meta` → `scheduled_at = 2026-03-16 09:00`, `total_recipients = 140`, mas `sent_count = 0`, `failed_count = 0`
  - outra campanha anterior falhou com o mesmo padrão
- Para essas campanhas, não existem registos em `email_sends`.
- A função agendada marca a campanha como falhada quando procura destinatários em fila (`status = queued`) e não encontra nenhum.

Causa provável

- No fluxo de agendamento, a campanha é marcada como `scheduled` antes de garantir que a fila de destinatários foi criada com sucesso.
- Em `CreateCampaignModal.tsx`, os registos em fila usam `org?.id` vindo de um hook assíncrono, em vez de usar o id da organização já garantido no contexto autenticado.
- Se a inserção da fila falhar por qualquer motivo, o `catch` atual praticamente engole o problema:
  - não faz rollback da campanha
  - não deixa uma indicação persistente do erro
- Resultado:
  1. a campanha fica “agendada”
  2. mas sem destinatários na fila
  3. quando chega a hora, o processador encontra zero destinatários e marca `failed`

Plano de correção

1. Corrigir o fluxo de agendamento
- Em `src/components/marketing/CreateCampaignModal.tsx`:
  - usar sempre o id de organização garantido pelo contexto autenticado
  - criar primeiro a fila de destinatários
  - só depois marcar a campanha como `scheduled`
- Se a criação da fila falhar:
  - manter a campanha em `draft`
  - mostrar erro explícito ao utilizador

2. Tornar a falha visível e recuperável
- Melhorar o tratamento de erro no agendamento para não haver “agendada falsa”.
- Guardar uma mensagem clara quando o agendamento falhar por ausência de destinatários em fila.

3. Reforçar o processador agendado
- Em `supabase/functions/process-scheduled-campaigns/index.ts`:
  - manter a validação de fila
  - adicionar logging mais explícito para distinguir:
    - campanha sem fila
    - campanha sem template/conteúdo
    - campanha sem remetente
- Isso facilita perceber imediatamente a causa da falha da próxima vez.

4. Recuperação das campanhas já afetadas
- Reabrir campanhas `failed` como `draft`
- Regenerar a fila correta de destinatários
- Reagendar novamente

Conclusão

- O erro principal não foi no envio em si, nem timeout do backend.
- O mais provável é que o agendamento foi guardado sem a fila de destinatários, e por isso o processador marcou como falhado quando chegou a hora.

Detalhe técnico
- Ficheiro principal do bug: `src/components/marketing/CreateCampaignModal.tsx`
- Ficheiro que expõe o sintoma: `supabase/functions/process-scheduled-campaigns/index.ts`
- Evidência mais forte: campanhas falhadas com `total_recipients` preenchido, mas zero registos em `email_sends`

Implementação que eu faria a seguir
- corrigir a ordem do agendamento
- impedir estado `scheduled` sem fila criada
- melhorar logs/erros
- depois reativar as campanhas falhadas para novo agendamento seguro
