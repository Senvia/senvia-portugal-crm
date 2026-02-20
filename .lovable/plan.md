
## Emails Automaticos de Aviso de Expiracao do Trial

Criar uma edge function que envia emails automaticos via Brevo quando faltam 3 dias e 1 dia para o trial expirar, agendada via pg_cron.

### Como Funciona

A edge function `trial-expiry-reminders` corre diariamente e:
1. Procura organizacoes onde `trial_ends_at` esta a exatamente 3 dias ou 1 dia de expirar
2. Para cada organizacao, encontra o admin (owner) e o seu email
3. Envia um email via Brevo com o aviso e link para escolher plano
4. Regista o envio numa nova coluna `trial_reminders_sent` (JSONB) na tabela `organizations` para nao enviar duplicados

### Alteracoes

**1. Migracao SQL**

Adicionar coluna `trial_reminders_sent JSONB DEFAULT '{}'` a tabela `organizations` para rastrear quais lembretes ja foram enviados (ex: `{"3_days": true, "1_day": true}`).

**2. Nova Edge Function: `trial-expiry-reminders/index.ts`**

- Usa o `BREVO_API_KEY` global (ja configurado como secret) para enviar emails do sistema
- Remetente: `noreply@senvia.pt` (ou o sender verificado no Brevo global)
- Query: organizacoes com `billing_exempt = false`, `trial_ends_at` entre 1-3 dias no futuro, e que ainda nao receberam o lembrete correspondente
- Para cada org encontrada:
  - Busca o primeiro membro admin e o seu email via `auth.admin.getUserById()`
  - Envia email via Brevo API com template HTML inline
  - Atualiza `trial_reminders_sent` para marcar como enviado
- Template do email inclui:
  - Logo Senvia
  - Mensagem personalizada com nome da organizacao
  - Dias restantes
  - Botao "Escolher Plano" com link para a app
  - Aviso sobre eliminacao de dados apos 60 dias

**3. Agendar via pg_cron**

Agendar a funcao para correr diariamente as 08:00 (horario adequado para emails de aviso).

**4. Atualizar `supabase/config.toml`**

Adicionar `verify_jwt = false` para a nova funcao.

### Template dos Emails

**Email 3 dias:**
- Assunto: "O seu periodo de teste termina em 3 dias"
- Corpo: Lembrete amigavel com botao para escolher plano

**Email 1 dia:**
- Assunto: "Ultimo dia do seu periodo de teste"
- Corpo: Urgencia maior, lembrete que amanha perde acesso

### Detalhes Tecnicos

| Ficheiro | Alteracao |
|----------|-----------|
| Migracao SQL | Adicionar `trial_reminders_sent JSONB` |
| `supabase/functions/trial-expiry-reminders/index.ts` | Nova edge function |
| `supabase/config.toml` | Adicionar config da funcao |
| pg_cron | Agendar execucao diaria as 08:00 |

### Fluxo

```text
Dia 11 do trial (faltam 3 dias):
  -> Cron dispara as 08:00
  -> Encontra org com trial_ends_at = daqui a 3 dias
  -> Envia email "3 dias restantes"
  -> Marca trial_reminders_sent = {"3_days": true}

Dia 13 do trial (falta 1 dia):
  -> Cron dispara as 08:00
  -> Encontra org com trial_ends_at = daqui a 1 dia
  -> Envia email "Ultimo dia"
  -> Marca trial_reminders_sent = {"3_days": true, "1_day": true}

Dia 14: Trial expira -> Bloqueio
```
