

## Alterar gatilho "Nova Venda Criada" para "Venda Concluída"

Tens razão --- não faz sentido enviar um email automático quando a venda é criada (pode estar em progresso). O email deve ser enviado quando a venda muda para o estado "Concluída".

### Alterações

**1. Remover o trigger `sale_created` e usar apenas `sale_status_changed`**

No ficheiro `src/hooks/useAutomations.ts`:
- Remover a linha `{ value: 'sale_created', label: 'Nova Venda Criada' }`
- Renomear `sale_status_changed` para `Venda Concluída` (o value interno mantém-se `sale_status_changed`)

**2. Migrar o template "Inicio Contratual" existente na base de dados**

Atualizar o template que está configurado com `automation_trigger_type = 'sale_created'` para usar `sale_status_changed` com `trigger_config = { "to_status": "completed" }`, para que dispare apenas quando a venda muda para "Concluída".

**3. Nenhuma alteração na edge function `process-automation`**

A lógica de `matchesTriggerConfig` já suporta verificar `to_status` e `from_status`. O trigger de base de dados `notify_automation_trigger` já dispara `sale_status_changed` quando `OLD.status IS DISTINCT FROM NEW.status`. Tudo já funciona --- só precisa do template mapeado correctamente.

### Resultado
- O dropdown de gatilhos mostrará "Venda Concluída" em vez de "Nova Venda Criada"
- Ao seleccionar este gatilho, aparece o selector de estados (de/para) onde se configura "Para: Concluída"
- O template "Inicio Contratual" será re-mapeado automaticamente

