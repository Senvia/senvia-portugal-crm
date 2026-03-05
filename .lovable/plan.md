

## Emails enviados pelo domínio de cada colaborador

### Contexto atual
Hoje, todos os emails são enviados com `sender: { name: org.name, email: org.brevo_sender_email }` — ou seja, sempre o remetente da organização. Queremos que cada colaborador possa ter o seu próprio email de remetente verificado na Brevo.

### Solução

| Componente | Alteração |
|---|---|
| **Database** | Adicionar coluna `brevo_sender_email` à tabela `profiles` (text, nullable) |
| **UI — Definições → A Minha Conta** | Novo campo "Email de envio (Brevo)" abaixo do email de contacto, onde o colaborador insere o seu email verificado na Brevo |
| **`useProfile.ts`** | Incluir `brevo_sender_email` no `mutationFn` |
| **Edge function `send-template-email`** | Na query do perfil do sender, buscar também `brevo_sender_email`. Se existir, usar como `sender.email` em vez de `org.brevo_sender_email`. O `sender.name` passa a ser o `full_name` do colaborador (fallback: org.name) |

### Lógica de prioridade no envio

```text
sender.email = profile.brevo_sender_email ?? org.brevo_sender_email
sender.name  = profile.full_name ?? org.name
```

Se o colaborador não configurou o seu email Brevo, o sistema continua a usar o da organização como fallback.

### Ficheiros afetados
1. **Migração SQL** — `ALTER TABLE profiles ADD COLUMN brevo_sender_email text;`
2. **`src/components/settings/GeneralContent.tsx`** — Novo campo de input
3. **`src/hooks/useProfile.ts`** — Adicionar campo ao update
4. **`supabase/functions/send-template-email/index.ts`** — Usar sender do perfil com fallback para org

