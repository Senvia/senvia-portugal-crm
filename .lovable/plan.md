

## Bug: Validação de NIF a detetar duplicados de outra organização

### Análise

O `useNifValidation` consulta `crm_clients` com `.eq('organization_id', organization.id)` — o que deveria isolar por organização. No entanto, a política RLS da tabela `crm_clients` usa `get_user_org_id(auth.uid())`, que depende do JWT `active_organization_id`. Se o JWT não estiver sincronizado com a organização ativa na UI (ex: após trocar de organização sem refresh do token), o RLS pode devolver dados da organização errada.

**Causa provável**: Ao trocar de organização na UI, o `active_organization_id` no JWT não é atualizado (está guardado apenas em `localStorage`), e o fallback do `get_user_org_id` retorna a primeira organização por `joined_at` — que pode ser Perfect2Gether em vez de SENVIA.

### Solução

| Ficheiro | Alteração |
|---|---|
| `src/hooks/useNifValidation.ts` | Nenhuma mudança necessária — a query já filtra por `organization_id` |
| `src/contexts/AuthContext.tsx` | Ao fazer `switchOrganization`, garantir que o `app_metadata.active_organization_id` é atualizado no JWT via `supabase.auth.updateUser()`, não apenas em `localStorage`. Isso sincroniza o RLS com a UI. |

### Alteração concreta

Na função `switchOrganization` do `AuthContext`, após guardar em localStorage, chamar:
```typescript
await supabase.auth.updateUser({
  data: { active_organization_id: orgId }
});
```

Isto garante que o JWT passa o `active_organization_id` correto para o `get_user_org_id`, alinhando o RLS com a organização selecionada na UI.

