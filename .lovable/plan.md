
Objetivo: eliminar definitivamente o erro `403 / new row violates row-level security policy` ao submeter um pedido interno em `/financeiro`.

Resumo do diagnóstico (já confirmado com dados reais do backend):
1. A policy de INSERT está correta e ativa (PERMISSIVE + `WITH CHECK`).
2. O reload de schema também já foi executado.
3. O erro persiste porque a validação da policy compara:
   - `organization_id` enviado no request: `96a3950e-31be-4c6d-abed-b82968c0d7e9`
   - `get_user_org_id(auth.uid())`: `06fe9e1d-9670-45b0-8717-c5a6e90be380`
4. O utilizador que está a testar tem role `super_admin`, mas não é membro direto da org `96a...` (acede via privilégios de super admin).
5. Resultado: o `WITH CHECK` da policy de INSERT falha, logo o `403` continua.

Plano de correção:
1. Adicionar uma policy dedicada para super admin em `internal_requests` (FOR ALL), permitindo operações em qualquer organização quando `has_role(auth.uid(), 'super_admin') = true`.
2. Manter as policies atuais para utilizadores normais (sem afrouxar segurança para não-super-admin).
3. Forçar reload do schema após criar a nova policy para evitar qualquer cache residual.
4. Validar em dois cenários:
   - Super admin na org `telecom` consegue submeter pedido.
   - Utilizador normal continua bloqueado fora da sua organização.

Detalhe técnico da migração (a implementar):
```sql
-- Garantir idempotência
DROP POLICY IF EXISTS "Super admin full access internal_requests" ON public.internal_requests;

CREATE POLICY "Super admin full access internal_requests"
ON public.internal_requests
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Garantir refresh imediato das policies no API layer
NOTIFY pgrst, 'reload schema';
```

Ficheiros a alterar:
- `supabase/migrations/<timestamp>_fix_internal_requests_super_admin_policy.sql` (novo)

Sem alterações obrigatórias no frontend para resolver a falha:
- `SubmitRequestModal.tsx` e `useInternalRequests.ts` podem ficar como estão para este fix.

Validação pós-correção (end-to-end):
1. Entrar em `/financeiro` na org `telecom`.
2. Criar “Novo Pedido” (tipo despesa, título e valor).
3. Confirmar:
   - request `POST /rest/v1/internal_requests` retorna sucesso (201/200).
   - toast de sucesso aparece.
   - linha surge na tabela de pedidos.
4. Teste de segurança:
   - com utilizador não super admin, tentar criar pedido noutra org deve continuar a falhar por RLS.

Riscos e mitigação:
- Risco: super admin ganhar permissões amplas nesta tabela.
- Mitigação: isto já está alinhado com o comportamento esperado no restante sistema (super admin multi-tenant), e não abre acesso para utilizadores normais.
