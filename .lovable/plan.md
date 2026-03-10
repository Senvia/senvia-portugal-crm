

## Problema: Widget "Performance da Equipa" não aparece no Dashboard

### Diagnóstico

Encontrei **dois problemas**:

1. **O teu utilizador (Thiago Sousa) não tem perfil atribuído** — o campo `profile_id` está vazio no registo de membro da organização. Além disso, como és super_admin, o sistema ignora completamente a consulta de perfil (por design).

2. **O widget `team_performance_table` no perfil "Administrador" está sem o campo `is_visible`** — os outros widgets têm `is_visible: true`, mas este foi gravado sem esse campo, e o filtro `widgets.filter(w => w.is_visible)` exclui-o.

Resultado: mesmo que o perfil fosse lido, o widget seria filtrado.

### Solução

**1. `src/hooks/useDashboardWidgets.ts`**
- Para super_admins e admins sem perfil atribuído, permitir que o sistema leia o `dashboard_widgets` de um perfil da organização marcado como "admin" (ou o primeiro perfil com widgets configurados), em vez de cair diretamente no fallback de nicho.
- Tratar `is_visible` como `true` por defeito quando o campo não existe no JSON (defensivo).

**2. `src/hooks/usePermissions.ts`**
- Para super_admins: buscar o perfil "Administrador" da organização para obter `dashboard_widgets`, mesmo que não haja `profile_id` atribuído.
- Alternativa mais simples: no `useDashboardWidgets`, se o user é admin/super_admin e `profileDashboardWidgets` é null, consultar diretamente os perfis da organização para encontrar um com widgets configurados.

**Abordagem mais simples (recomendada):**
- Em `useDashboardWidgets.ts`, quando `profileDashboardWidgets` é null e o user é admin, buscar `dashboard_widgets` do perfil "Administrador" da organização como fallback.
- Adicionar `?? true` ao check de `is_visible` para tratar entradas sem esse campo.

### Alterações concretas

**`src/hooks/useDashboardWidgets.ts`**
- Adicionar query para buscar `dashboard_widgets` do perfil admin da organização como fallback para super_admins
- Alterar filtro: `pw.is_visible` → `pw.is_visible !== false` (default true)

**`src/hooks/usePermissions.ts`**
- Sem alterações necessárias

