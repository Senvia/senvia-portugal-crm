

## Notificar o utilizador quando o pedido e aprovado ou rejeitado

Quando um administrador aprova ou rejeita um pedido interno, o colaborador que o submeteu deve receber um email automatico com o resultado.

### Abordagem

Criar uma nova edge function `notify-request-status` que envia um email via Brevo ao utilizador que submeteu o pedido, informando se foi aprovado, rejeitado ou pago.

### Alteracoes

**1. Nova Edge Function `supabase/functions/notify-request-status/index.ts`**

- Recebe: `request_id`, `organization_id`, `new_status`, `review_notes` (opcional)
- Busca o pedido na tabela `internal_requests` para obter o `submitted_by` e o `title`
- Busca o email do utilizador na tabela `auth.users` (via service role)
- Busca as credenciais Brevo e nome da organizacao
- Envia email ao submissor com o estado atualizado e eventuais notas de revisao
- Template do email com cores diferentes consoante o estado:
  - Aprovado: verde
  - Rejeitado: vermelho
  - Pago: verde escuro

**2. Atualizar `src/hooks/useInternalRequests.ts`**

- No `onSuccess` da mutacao `reviewRequest`, adicionar uma chamada silenciosa (`.catch(() => {})`) a nova edge function, passando o `request_id`, `organization_id`, `new_status` e `review_notes`
- Apenas dispara para estados `approved`, `rejected` e `paid`

**3. Atualizar `supabase/config.toml`** (automatico)

- Adicionar entrada para `notify-request-status` com `verify_jwt = false` (a validacao e feita no codigo)

### Detalhes tecnicos

- A edge function usa o `SUPABASE_SERVICE_ROLE_KEY` para aceder ao email do utilizador em `auth.users` e as credenciais Brevo da organizacao
- Reutiliza o mesmo padrao da `notify-finance-request` existente (auth via Bearer token, Brevo API)
- Nao requer migracao de base de dados -- toda a informacao necessaria ja existe nas tabelas `internal_requests`, `profiles` e `organizations`
- Os labels de tipo de pedido (`expense`, `vacation`, `invoice`) sao traduzidos no template do email

### Ficheiros a criar/alterar
- **Criar**: `supabase/functions/notify-request-status/index.ts`
- **Alterar**: `src/hooks/useInternalRequests.ts` (adicionar chamada no onSuccess do reviewRequest)

