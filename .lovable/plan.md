
# Corrigir Check Constraint na Tabela email_sends

## Problema

Todos os inserts da Edge Function `sync-campaign-sends` estao a falhar com:

```
violates check constraint "email_sends_status_check"
```

A tabela `email_sends` tem um CHECK constraint que so aceita 3 valores:
- `pending`, `sent`, `failed`

Mas a Brevo devolve eventos com estados como `delivered`, `bounced`, `blocked`, `spam` — e a Edge Function tenta inseri-los, sendo todos rejeitados. Por isso:
- **0 Destinatarios** (nenhum registo novo foi inserido, o `total_recipients` nunca foi actualizado)
- **0 Aberturas / 0 Cliques / 0 Erros** (os 19 registos antigos tem status `sent` mas sem `opened_at` / `clicked_at`)

## Solucao

### 1. Migracao SQL - Expandir o CHECK constraint

Alterar o constraint para aceitar todos os estados possiveis da Brevo:

```sql
ALTER TABLE email_sends DROP CONSTRAINT email_sends_status_check;
ALTER TABLE email_sends ADD CONSTRAINT email_sends_status_check 
  CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'blocked', 'spam'));
```

### 2. Sem alteracoes de codigo

A Edge Function e o modal ja estao correctos. Uma vez que o constraint aceite os novos valores:
- O auto-sync vai popular os registos com os dados da Brevo
- O `total_recipients` vai ser actualizado automaticamente
- As metricas (Aberturas, Cliques, Erros) vao aparecer correctamente
- Os nomes dos destinatarios vao ser populados a partir do email (parte antes do @)

## Resultado Esperado

Apos a migracao, ao abrir o modal da campanha:
- Destinatarios: numero real de emails enviados
- Enviados: emails entregues com sucesso
- Aberturas: emails abertos (com percentagem)
- Cliques: emails com cliques (com percentagem)
- Erros: bounces + bloqueados + spam
