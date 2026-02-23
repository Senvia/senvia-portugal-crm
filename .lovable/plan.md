

# Restringir o Otto aos Perfis de Acesso do Colaborador

## Problema Atual
O Otto tem acesso total a todas as ferramentas de pesquisa (clientes, leads, faturas, vendas, propostas, agenda, finanças) independentemente do perfil de acesso do utilizador logado. Um "Vendedor" sem acesso a Finanças consegue pedir ao Otto dados financeiros.

## Solucao

### Alteracoes em `supabase/functions/otto-chat/index.ts`

**1. Buscar o perfil de permissoes do utilizador** (apos validar membership, ~linha 480):

Quando temos `userId` e `orgId`, consultar `organization_members.profile_id` e depois `organization_profiles.module_permissions` para obter as permissoes granulares. Tambem verificar se e super_admin/admin (que tem acesso total).

```typescript
// Fetch user permissions
let userPermissions: Record<string, any> | null = null;
let isAdminUser = false;

if (userId && orgId) {
  // Check admin role
  const { data: adminRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"]);
  
  isAdminUser = (adminRole && adminRole.length > 0);

  if (!isAdminUser) {
    const { data: member } = await supabaseAdmin
      .from("organization_members")
      .select("profile_id")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (member?.profile_id) {
      const { data: profile } = await supabaseAdmin
        .from("organization_profiles")
        .select("module_permissions")
        .eq("id", member.profile_id)
        .maybeSingle();
      
      userPermissions = profile?.module_permissions || null;
    }
  }
}
```

**2. Filtrar as ferramentas com base nas permissoes:**

Criar um mapeamento de cada tool para o modulo/subarea que requer:

```typescript
const TOOL_PERMISSION_MAP: Record<string, { module: string; subarea: string; action: string }> = {
  search_clients:     { module: "clients",   subarea: "list",      action: "view" },
  get_client_details: { module: "clients",   subarea: "list",      action: "view" },
  search_leads:       { module: "leads",     subarea: "kanban",    action: "view" },
  search_invoices:    { module: "finance",   subarea: "invoices",  action: "view" },
  search_sales:       { module: "sales",     subarea: "sales",     action: "view" },
  search_proposals:   { module: "proposals", subarea: "proposals", action: "view" },
  get_sale_details:   { module: "sales",     subarea: "sales",     action: "view" },
  get_pipeline_summary:  { module: "leads",    subarea: "kanban",  action: "view" },
  get_finance_summary:   { module: "finance",  subarea: "summary", action: "view" },
  get_upcoming_events:   { module: "calendar", subarea: "events",  action: "view" },
  search_credit_notes:   { module: "finance",  subarea: "invoices",action: "view" },
};
```

Funcao helper para verificar permissao:

```typescript
function canUseTool(toolName: string, permissions: any, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  const req = TOOL_PERMISSION_MAP[toolName];
  if (!req) return true;
  if (!permissions) return false; // sem perfil = sem acesso
  const mod = permissions[req.module];
  if (!mod?.subareas) return false;
  const sub = mod.subareas[req.subarea];
  if (!sub) return false;
  return sub[req.action] === true;
}
```

**3. Aplicar o filtro antes de enviar ao modelo:**

```typescript
const toolsForModel = hasDataAccess
  ? TOOLS.filter(t => canUseTool(t.function.name, userPermissions, isAdminUser))
  : [];
```

**4. Informar o Otto sobre as restricoes no system prompt:**

Adicionar ao contexto uma nota sobre os modulos que o utilizador NAO tem acesso, para que o Otto responda adequadamente:

```typescript
const blockedModules = Object.entries(TOOL_PERMISSION_MAP)
  .filter(([name]) => !canUseTool(name, userPermissions, isAdminUser))
  .map(([_, perm]) => perm.module);
const uniqueBlocked = [...new Set(blockedModules)];

if (uniqueBlocked.length > 0) {
  systemPromptExtra += `\n\nRESTRIÇÕES DO PERFIL: Este utilizador NÃO tem acesso aos módulos: ${uniqueBlocked.join(', ')}. Se perguntar sobre estes módulos, informa que não tem permissão e sugere contactar o administrador.`;
}
```

### Resultado

- Um "Vendedor" que nao tem acesso a Financas, ao perguntar "qual o resumo financeiro?", recebera: "Nao tens permissao para aceder ao modulo Financas. Contacta o teu administrador."
- Um "Administrador" continua com acesso total.
- Super admins mantêm acesso total.
- As ferramentas sao filtradas server-side -- impossivel contornar pelo frontend.

### Ficheiros a alterar
- `supabase/functions/otto-chat/index.ts`

