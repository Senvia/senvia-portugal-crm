

## Esconder o Webhook Senvia OS da interface

### Problema

A migracao anterior copiou o URL do webhook do Senvia OS (`https://n8n-n8n.tx2a4o.easypanel.host/webhook/senvia-os`) para a tabela `organization_webhooks` como webhook normal (`is_system = false`), tornando-o visivel e editavel pelos clientes.

Este webhook ja esta hardcoded na edge function `submit-lead` como constante `SENVIA_SYSTEM_WEBHOOK_URL`, por isso nao precisa de existir na tabela.

### Solucao

Uma unica migracao SQL para apagar todas as entradas na tabela `organization_webhooks` cujo URL contenha `senvia-os`. Nao e necessario alterar nenhum ficheiro de codigo -- o webhook ja funciona de forma invisivel atraves da constante no `submit-lead`.

### Alteracoes

**1. Migracao SQL**

Apagar os registos migrados com o URL do Senvia OS:

```text
DELETE FROM organization_webhooks
WHERE url LIKE '%senvia-os%';
```

Isto remove os 2 registos existentes (um por cada organizacao) que foram criados pela migracao anterior. O webhook continua a funcionar normalmente porque esta hardcoded no codigo da edge function.

### Nenhuma alteracao de codigo necessaria

- A edge function `submit-lead` ja tem o webhook fixo como `SENVIA_SYSTEM_WEBHOOK_URL`
- O hook `useOrganizationWebhooks` ja filtra `is_system = false`, mas como estes registos estao como `is_system = false`, a unica forma segura de os esconder e apaga-los
- O nome "Webhook Senvia" fica apenas no codigo da edge function como referencia interna

### Ficheiros a alterar
- Apenas uma migracao SQL (sem alteracoes de codigo)
