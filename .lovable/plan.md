
# Corrigir Listas Automáticas Stripe/Trial

## Problemas Identificados

1. **Variáveis `app.settings` nulas**: A função `create_organization_for_current_user` usa `current_setting('app.settings.supabase_url')` e `current_setting('app.settings.anon_key')` para disparar automações via `pg_net`, mas estas variáveis nunca foram configuradas. Resultado: o gatilho `trial_started` nunca dispara.

2. **Cron `check-trial-status` inexistente**: A edge function foi criada mas o cron job para a executar diariamente nunca foi registado na base de dados. Resultado: os gatilhos `trial_expiring_3d`, `trial_expiring_1d` e `trial_expired` nunca disparam.

3. **Sem backfill de dados existentes**: As 2 organizações existentes (Perfect2Gether com plano elite, Construpao com plano elite + trial ativo) nunca foram sincronizadas para as listas automáticas.

## Solução

### 1. Migração SQL -- Corrigir tudo de uma vez

Uma única migração que:

**a) Configura as variáveis `app.settings`**
```text
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://zppcobirzgpfcrnxznwe.supabase.co';
```
Nota: `ALTER DATABASE` não é permitido nas migrações. Alternativa: atualizar a função `create_organization_for_current_user` para usar os valores diretamente (hardcoded), seguindo o mesmo padrão já usado no trigger `notify_automation_trigger` que já tem o URL e chave hardcoded.

**b) Corrige a função `create_organization_for_current_user`**

Substituir as chamadas a `current_setting('app.settings...')` por valores diretos:
```text
url := 'https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/process-automation'
headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'
```

**c) Backfill das organizações existentes nas listas corretas**

Para cada organização existente:
- Criar/upsert contacto de marketing na org Senvia Agency
- Se tem plano ativo: adicionar à lista do plano correspondente (Plano Elite)
- Se está em trial: adicionar à lista "Clientes em Trial"

### 2. Registar o cron `check-trial-status`

Inserir o cron job via SQL direto (não migração):
```text
SELECT cron.schedule(
  'check-trial-status-daily',
  '0 8 * * *',
  $$ SELECT net.http_post(...check-trial-status...) $$
);
```

## Ficheiros Alterados

1. **Nova migração SQL** -- Corrigir `create_organization_for_current_user` com URLs diretos + backfill de dados existentes
2. **SQL direto (cron)** -- Registar o cron job `check-trial-status-daily`

## Resultado Esperado

Após a implementação:
- Perfect2Gether (elite, sem trial) ira aparecer na lista "Plano Elite"
- Construpao (elite, trial ativo até 09/03) ira aparecer em "Plano Elite" e "Clientes em Trial"
- Novas organizações criadas serão automaticamente adicionadas a "Clientes em Trial" e dispararão o gatilho `trial_started`
- O cron diário ira detetar trials a expirar e mover contactos entre listas
