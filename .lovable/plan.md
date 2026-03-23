

## Tornar o módulo Prospects disponível para todas as organizações

### Situação actual
O módulo Prospects está hardcoded para funcionar **apenas** na organização Perfect2Gether (P2G). A função `hasPerfect2GetherAccess()` verifica se o `organizationId === PERFECT2GETHER_ORG_ID`, bloqueando todas as outras orgs.

### Solução
Transformar Prospects num módulo normal, controlado pelo sistema de módulos existente (`enabled_modules`), tal como Vendas, Marketing, etc. Qualquer organização poderá ativar/desativar Prospects nas Definições → Módulos.

### Alterações

**1) `src/hooks/useModules.ts`** — adicionar `prospects` ao `EnabledModules`
- Adicionar `prospects: false` ao `EnabledModules` interface e `DEFAULT_MODULES` (desativado por default)

**2) `src/components/settings/ModulesTab.tsx`** — adicionar card "Prospects" à lista de módulos
- Novo item: `{ key: 'prospects', label: 'Prospects', description: 'Importação e distribuição de prospects para a equipa comercial', icon: Search }`

**3) `src/components/layout/AppSidebar.tsx`** — mover Prospects para `allNavItems`
- Adicionar `{ to: "/prospects", icon: Search, label: "Prospects", moduleKey: 'prospects' }` ao array `allNavItems`
- Remover o bloco hardcoded `{hasPerfect2GetherModuleAccess && (<NavLink to="/prospects" .../>)}`
- Manter o Portal Total Link hardcoded para P2G (esse continua exclusivo)

**4) `src/components/layout/MobileMenu.tsx`** e **`MobileBottomNav.tsx`** — mesma lógica: adicionar Prospects como nav item com `moduleKey: 'prospects'` e remover o bloco P2G hardcoded para Prospects

**5) `src/pages/Prospects.tsx`** — remover a verificação `hasPerfect2GetherAccess` como guard de acesso (o sistema de módulos já controla visibilidade). Manter a verificação P2G apenas para features específicas de energia (segmentos, CPE columns) se existirem.

**6) `src/hooks/useProspects.ts`** — substituir `hasPerfect2GetherAccess` por verificação do módulo `prospects` estar activo. O acesso à data passa a ser controlado por `organization_id` do user logado (já funciona assim via RLS).

**7) P2G auto-activação** — criar uma migration para activar `prospects: true` no `enabled_modules` da organização P2G, para que não percam o acesso existente.

### Ficheiros alterados
| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useModules.ts` | Adicionar `prospects` ao interface e defaults |
| `src/components/settings/ModulesTab.tsx` | Adicionar card Prospects |
| `src/components/layout/AppSidebar.tsx` | Mover Prospects para navItems normal |
| `src/components/layout/MobileMenu.tsx` | Idem |
| `src/components/layout/MobileBottomNav.tsx` | Idem |
| `src/pages/Prospects.tsx` | Remover guard P2G |
| `src/hooks/useProspects.ts` | Substituir guard P2G por módulo |
| Migration SQL | Activar prospects para P2G |

