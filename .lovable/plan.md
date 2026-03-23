

## Corrigir RLS do módulo RH para super_admins

### Problema
A policy de INSERT na tabela `rh_absences` exige `is_org_member(auth.uid(), organization_id)`, mas super_admins não têm registo na `organization_members` — logo o pedido é rejeitado.

### Correção (migration SQL)

Atualizar 2 policies:

1. **`rh_absences` INSERT** — adicionar `OR has_role(auth.uid(), 'super_admin')`:
```sql
DROP POLICY rh_absences_insert ON rh_absences;
CREATE POLICY rh_absences_insert ON rh_absences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (is_org_member(auth.uid(), organization_id) OR has_role(auth.uid(), 'super_admin')));
```

2. **`rh_absences` SELECT** — também incluir super_admin para consistência:
```sql
DROP POLICY rh_absences_select ON rh_absences;
CREATE POLICY rh_absences_select ON rh_absences FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_org_member(auth.uid(), organization_id) OR has_role(auth.uid(), 'super_admin'));
```

3. **`rh_absences` DELETE** e **UPDATE** — já permitem operações do próprio user ou admin, mas adicionar super_admin ao UPDATE:
```sql
DROP POLICY rh_absences_update ON rh_absences;
CREATE POLICY rh_absences_update ON rh_absences FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() AND status = 'pending')
    OR is_org_admin(auth.uid(), organization_id)
    OR has_role(auth.uid(), 'super_admin')
  );
```

### Ficheiros alterados
- Migration SQL — atualizar 3 RLS policies em `rh_absences`

