

## Problema: Métricas de Email a Zero

### Causa Raiz
A tabela `email_sends` não tem uma política RLS para super admins. A tua conta é `super_admin` e está na org `06fe9e1d-...`, mas estás a visualizar a org `96a3950e-...` (Perfect2Gether). A tabela `email_templates` funciona porque tem uma policy "Super admin full access", mas `email_sends` não tem essa policy.

Existem 22 registos na base de dados para esta org (14 sent, 7 delivered, 1 failed) mas o RLS bloqueia o acesso.

### Correção

Adicionar uma política RLS de super admin à tabela `email_sends`:

```sql
CREATE POLICY "Super admin full access email_sends"
ON public.email_sends
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
```

Isto é uma migração simples, sem alteração de código frontend.

