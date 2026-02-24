

# Finanças Telecom: Acesso Restrito a "Outros" + Notificação por Email

## Resumo

Tres alteracoes principais:

1. **Finanças Telecom** -- Para organizacoes telecom, a pagina de Financas mostra apenas a aba "Outros" (Pedidos Internos), ocultando Resumo, Contas e Faturas.

2. **Pedidos Internos por utilizador** -- Cada colaborador ve apenas os seus proprios pedidos. Um perfil especifico (com permissao `finance.requests.approve`) ve todos os pedidos da organizacao para validar e pagar.

3. **Notificacao por email** -- Quando um colaborador submete um pedido, o responsavel financeiro recebe um email via Brevo. Adicionar campo "Email Financeiro" nas definicoes de notificacoes por email.

---

## Secao Tecnica

### 1. Coluna na tabela `organizations`

Adicionar campo para o email do responsavel financeiro:

```sql
ALTER TABLE organizations ADD COLUMN finance_email text;
```

### 2. Finance.tsx -- Ocultar abas para telecom

```text
Logica:
- Se organization.niche === 'telecom': mostrar apenas a aba "Outros"
- O defaultValue do Tabs passa a ser 'outros' para telecom
- As abas Resumo, Contas, Faturas ficam condicionadas a !isTelecom
```

### 3. Pedidos Internos -- Visibilidade por utilizador

A tabela `internal_requests` ja tem RLS que limita SELECT:
- Utilizador normal: ve apenas `submitted_by = auth.uid()`
- Admin: ve todos da organizacao

Para o perfil especifico (ex: "Financeiro"), a permissao `finance.requests.approve` e verificada no `ReviewRequestModal`. A visibilidade dos pedidos de outros e controlada pela role `admin` no RLS existente.

**Alteracao necessaria**: Atualizar a RLS policy de SELECT para tambem permitir utilizadores com a permissao `approve` no perfil. Como o RLS nao consegue ler JSONB de perfis facilmente, a abordagem mais simples e:
- Criar uma funcao SQL `has_finance_approve_permission(user_id uuid)` que verifica se o membro tem a permissao `approve` na subarea `requests` do modulo `finance`
- Atualizar a policy SELECT para incluir esta funcao

```sql
CREATE OR REPLACE FUNCTION has_finance_approve_permission(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    JOIN organization_profiles op ON op.id = om.profile_id
    WHERE om.user_id = _user_id
      AND om.organization_id = get_user_org_id(_user_id)
      AND (op.module_permissions->'finance'->'subareas'->'requests'->'approve')::text = 'true'
  )
$$;
```

Atualizar a policy SELECT:
```sql
DROP POLICY "Users can view their own requests or admins view all" ON internal_requests;
CREATE POLICY "Users can view their own requests or authorized view all"
ON internal_requests FOR SELECT TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid())
  AND (
    submitted_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
    OR has_finance_approve_permission(auth.uid())
  )
);
```

Tambem atualizar a policy UPDATE para permitir quem tem `approve`:
```sql
DROP POLICY "Users can update own pending or admins can update any" ON internal_requests;
CREATE POLICY "Users can update own pending or authorized can update any"
ON internal_requests FOR UPDATE TO authenticated
USING (
  organization_id = get_user_org_id(auth.uid())
  AND (
    (submitted_by = auth.uid() AND status = 'pending')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
    OR has_finance_approve_permission(auth.uid())
  )
);
```

### 4. ReviewRequestModal -- Usar permissao granular

Alterar a verificacao de `isAdmin` para usar `can('finance', 'requests', 'approve')`:

```typescript
// ReviewRequestModal.tsx
const { can } = usePermissions();
const canApprove = can('finance', 'requests', 'approve');
// Substituir isAdmin por canApprove na logica de review
```

### 5. InternalRequests.tsx -- Mostrar contador para quem pode aprovar

Alterar `isAdmin` por `can('finance', 'requests', 'approve')` para mostrar o contador de pendentes.

### 6. NotificationEmailSettings -- Adicionar campo "Email Financeiro"

Adicionar um segundo card com:
- Switch para ativar notificacoes financeiras
- Campo de email para o responsavel financeiro
- Guardar em `organizations.finance_email`

### 7. Edge Function: `notify-finance-request`

Criar edge function que:
- Recebe `organization_id`, `request_title`, `request_type`, `submitter_name`
- Busca `finance_email`, `brevo_api_key`, `brevo_sender_email` da organizacao
- Envia email via Brevo API ao responsavel financeiro
- Assunto: "Novo Pedido Interno: {titulo}"
- Corpo HTML com detalhes do pedido

### 8. useInternalRequests.ts -- Chamar notificacao

No `onSuccess` do `submitRequest`, invocar a edge function:
```typescript
onSuccess: () => {
  toast.success('Pedido submetido com sucesso');
  queryClient.invalidateQueries({ queryKey: ['internal-requests'] });
  // Notificar silenciosamente
  supabase.functions.invoke('notify-finance-request', {
    body: { organization_id: organizationId, title: input.title, ... }
  }).catch(() => {}); // silencioso
}
```

### Ficheiros a criar/alterar:

| Ficheiro | Acao |
|---|---|
| Migracao SQL | Criar -- coluna `finance_email` + funcao + policies |
| `src/pages/Finance.tsx` | Alterar -- ocultar abas para telecom |
| `src/pages/finance/InternalRequests.tsx` | Alterar -- usar `can()` em vez de `isAdmin` |
| `src/components/finance/ReviewRequestModal.tsx` | Alterar -- usar `can()` em vez de `isAdmin` |
| `src/components/settings/NotificationEmailSettings.tsx` | Alterar -- adicionar card "Email Financeiro" |
| `src/hooks/useInternalRequests.ts` | Alterar -- chamar edge function |
| `supabase/functions/notify-finance-request/index.ts` | Criar -- edge function de notificacao |

