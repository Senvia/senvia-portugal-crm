

## Diagnóstico: Email automático não enviado em nova venda

### O que aconteceu
O trigger `sale_created` **está a disparar correctamente** — os logs confirmam:
```
Processing automation: sale_created for org 96a3950e...
WARNING: No email found in trigger record for sale_created
```

A venda 0014 foi criada com `client_id` e o cliente "Lucas" tem email `geral@senvia.pt`. **O problema é que a versão deployada da edge function ainda era a antiga** — sem o lookup do `client_id`. A mensagem de log `"No direct email, looking up client_id"` nunca aparece, indo directamente para `"No email found"`.

### O que já foi feito
Re-deployei agora a edge function `process-automation` com a versão corrigida que inclui o lookup via `client_id`.

### Resumo do fluxo
1. Crias venda → trigger `notify_automation_trigger` dispara `sale_created`
2. Edge function recebe o record da venda (sem `email` directo)
3. **Agora:** procura o `client_id` na tabela `crm_clients` → encontra `geral@senvia.pt`
4. Processa o template "Inicio Contratual" e envia o email

### Próximo passo
Cria uma nova venda de teste para confirmar que o email é agora enviado correctamente.

