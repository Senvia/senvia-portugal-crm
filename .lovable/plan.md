
# Corrigir Listas Automáticas Stripe/Trial

## ✅ CONCLUÍDO

### Problemas Corrigidos

1. **Variáveis `app.settings` nulas** → Função `create_organization_for_current_user` agora usa URLs hardcoded (mesmo padrão do `notify_automation_trigger`)
2. **Cron `check-trial-status` inexistente** → Registado cron job `check-trial-status-daily` a executar diariamente às 08:00
3. **Sem backfill de dados existentes** → Dados sincronizados:
   - Perfect2Gether → "Plano Elite" ✅
   - Construpao → "Plano Elite" + "Clientes em Trial" ✅

### Resultado

- Novas organizações são automaticamente adicionadas a "Clientes em Trial" e disparam `trial_started`
- O cron diário deteta trials a expirar e move contactos entre listas
- O webhook Stripe sincroniza planos, cancelamentos e reativações automaticamente
