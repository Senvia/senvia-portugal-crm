# Runbook — Migração para um Supabase próprio

Migra **schema + dados + utilizadores/passwords + storage + edge functions** do projeto
gerido pela Lovable (`zppcobirzgpfcrnxznwe`) para o teu novo projeto Supabase.

> **Passwords:** são hashes bcrypt em `auth.users.encrypted_password`. Ao copiar a
> tabela `auth.users`, **os utilizadores entram com a mesma password — sem reset.**
> (Ou seja, o aviso de "repor palavra-passe obrigatório" deixa de ser necessário.)

---

## Decisões já tomadas
- **Frontend → Vercel.** Sair da Lovable Cloud (o repo já tem `vercel.json`). A Lovable
  fica amarrada ao Supabase dela; com Supabase próprio, o deploy do frontend passa para a Vercel.
- **Sem reset de password** (migramos os hashes).

## Pré-requisitos
1. **Cliente PostgreSQL 15+** instalado (`pg_dump`, `psql`). No Windows: instalar
   "PostgreSQL 15" (ou usar WSL/Git Bash). Confirma: `pg_dump --version`.
2. **Supabase CLI** logado numa conta **com acesso ao NOVO projeto** (`supabase login`).
3. **Connection strings** dos dois projetos (Settings/Database → Connection string → **Session**, porta 5432).
   - A do projeto antigo obtém-se no dashboard da Lovable: **Cloud → Database → Connection string**.
4. Copiar `migration/migration.env.example` para `migration/.env` e preencher tudo.
   (`migration/.env` é gitignored — nunca commitar.)

## ⚠️ Janela de manutenção
Faz isto numa janela de manutenção e **congela escritas** no sistema antigo (ex.: pôr o
frontend antigo em modo manutenção) entre o dump e o cutover, senão dados criados depois
do dump perdem-se.

---

## Ordem de execução

| # | Ação | Onde | Ficheiro |
|---|------|------|----------|
| 1 | Ativar extensões | NEW (SQL Editor) | `sql/01-extensions.sql` |
| 2 | Schema + Auth + Dados | terminal | `scripts/dump-restore.sh` |
| 3 | Reaplicar grants | NEW (SQL Editor) | `sql/50-grants.sql` |
| 4 | Patch URL/anon key nas funções | NEW (SQL Editor) | `sql/70-patch-refs.sql` |
| 5 | Realtime publication | OLD→NEW (SQL Editor) | `sql/60-realtime.sql` |
| 6 | Recriar cron jobs | OLD→NEW (SQL Editor) | `sql/80-crons-export.sql` |
| 7 | Deploy edge functions | terminal | `scripts/deploy-functions.sh` |
| 8 | Copiar Storage | terminal | `scripts/storage-sync.mjs` |
| 9 | Secrets / Stripe / Auth providers | NEW (dashboard) | ver abaixo |
| 10 | Verificar | OLD+NEW (SQL Editor) | `sql/99-verify.sql` |
| 11 | Frontend → Vercel | repo + Vercel | ver abaixo |

### Passos de terminal (2, 7, 8)
```bash
# a partir da raiz do repo:
bash migration/scripts/dump-restore.sh        # passo 2
bash migration/scripts/deploy-functions.sh    # passo 7
node --env-file=migration/.env migration/scripts/storage-sync.mjs   # passo 8
```

### Passo 9 — manual no dashboard do NOVO projeto
- **Secrets** (Edge Functions → Secrets): re-adicionar — `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET` (novo, ver abaixo), `BREVO_API_KEY`, `APIFY_API_TOKEN`,
  e qualquer chave de IA usada pelo `otto-chat`. (Não há export — são write-only.)
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente.
- **Stripe**: criar **novo endpoint** de webhook apontando para
  `https://<NEW_REF>.supabase.co/functions/v1/stripe-webhook`, copiar o novo
  **signing secret** para `STRIPE_WEBHOOK_SECRET`.
- **Auth providers** (Google OAuth, etc.): reconfigurar client id/secret no novo projeto.
- **Auth → Site URL / Redirect URLs**: apontar para o domínio novo (Vercel).

### Passo 11 — Frontend (Vercel)
- Atualizar `.env` do projeto: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_SUPABASE_PROJECT_ID` com os valores do novo projeto.
- Atualizar `supabase/config.toml` → `project_id = "<NEW_REF>"`.
- Importar o repo na Vercel, definir as env vars `VITE_*`, e fazer deploy.

---

## Riscos / cuidados (já tratados nos scripts)
- **Grants**: o dump mantém privilégios e ainda corremos `50-grants.sql` por segurança.
- **Triggers durante import**: `--disable-triggers` no auth **e** nos dados → evita
  emails reais e colisões de `profiles`.
- **URL/anon key hard-coded** em funções (`notify_automation_trigger`,
  `create_organization_for_current_user`) e crons → tratados em `70-patch-refs.sql` e `80-crons-export.sql`.
- **Versão de Auth**: o restore de `auth.users` assume colunas iguais. Se o `psql` do
  passo 2 falhar em `auth.sql` por coluna inexistente, é incompatibilidade de versão —
  nesse caso importa só as colunas comuns (peça ajuda antes de forçar).
- **Vault**: segredos guardados no Supabase Vault não saem no `pg_dump` — re-adicionar à mão.
- **Storage**: copiado pelo `storage-sync.mjs` (o dump não move ficheiros).

## Rollback
Nada é apagado no projeto antigo. Se algo correr mal, o frontend continua a apontar para
o projeto antigo até fazeres o cutover no passo 11. Para reverter, basta não trocar as
env vars do frontend / reverter o deploy na Vercel.
