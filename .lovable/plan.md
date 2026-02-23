

# Eliminar Re-renders ao Navegar entre Paginas

## Problema
Atualmente, cada pagina (Dashboard, Leads, Clients, etc.) cria a sua propria instancia de `<ProtectedRoute>` e `<AppLayout>`. Quando navegas de `/dashboard` para `/leads`, o React **desmonta completamente** o Dashboard (incluindo sidebar, header, Otto) e **monta tudo do zero** na pagina de Leads. Isto causa:

- Logo recarrega (MobileHeader/AppSidebar re-monta)
- Otto FAB re-anima (animation `initial={{ scale: 0 }}`)
- Verificacao de subscricao re-executa
- Sidebar/Bottom Nav pisca

## Solucao: Layout Route com Outlet

Usar o padrao de **Layout Routes** do React Router v6. O `AppLayout` e o `ProtectedRoute` ficam **uma unica vez** no router, e as paginas renderizam dentro de um `<Outlet />`.

```text
Antes (atual):
  /dashboard -> ProtectedRoute -> Dashboard -> AppLayout -> Sidebar + Header + Otto
  /leads     -> ProtectedRoute -> Leads     -> AppLayout -> Sidebar + Header + Otto
  (tudo desmonta e remonta)

Depois (proposto):
  Layout Route -> ProtectedRoute -> AppLayout (Sidebar + Header + Otto)
    /dashboard -> Dashboard (so o conteudo)
    /leads     -> Leads (so o conteudo)
    (AppLayout persiste, so o conteudo troca)
```

## Ficheiros a Alterar

### 1. `src/components/layout/AppLayout.tsx`
- Adicionar suporte a `<Outlet />` como children por defeito
- Quando usado como Layout Route, renderiza `<Outlet />` no lugar do `{children}`
- Manter compatibilidade com children diretos (para nao partir nada)

### 2. `src/components/auth/ProtectedRoute.tsx`
- Criar uma versao "Layout" que renderiza `<Outlet />` em vez de `{children}`
- Ou adaptar para funcionar em ambos os modos

### 3. `src/App.tsx` (alteracao principal)
- Criar um Layout Route partilhado que engloba todas as rotas protegidas:

```text
<Route element={<ProtectedLayoutRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/leads" element={<Leads />} />
  <Route path="/clients" element={<Clients />} />
  ...
</Route>
```

### 4. Todas as 23 paginas que usam AppLayout
- Remover o wrapper `<AppLayout>` de cada pagina
- As paginas passam a renderizar apenas o seu conteudo interno
- Ficheiros afetados:
  - `src/pages/Dashboard.tsx`
  - `src/pages/Leads.tsx`
  - `src/pages/Clients.tsx`
  - `src/pages/Calendar.tsx`
  - `src/pages/Settings.tsx`
  - `src/pages/Proposals.tsx`
  - `src/pages/Sales.tsx`
  - `src/pages/Finance.tsx`
  - `src/pages/Ecommerce.tsx`
  - `src/pages/Marketing.tsx`
  - `src/pages/finance/Payments.tsx`
  - `src/pages/finance/Invoices.tsx`
  - `src/pages/finance/Expenses.tsx`
  - `src/pages/finance/InternalRequests.tsx`
  - `src/pages/ecommerce/Products.tsx`
  - `src/pages/ecommerce/Orders.tsx`
  - `src/pages/ecommerce/Customers.tsx`
  - `src/pages/ecommerce/Inventory.tsx`
  - `src/pages/ecommerce/Discounts.tsx`
  - `src/pages/ecommerce/Reports.tsx`
  - `src/pages/marketing/Templates.tsx`
  - `src/pages/marketing/Campaigns.tsx`
  - `src/pages/marketing/Reports.tsx`
  - `src/pages/marketing/Lists.tsx`

### 5. `src/components/otto/OttoFAB.tsx`
- Remover a animacao `initial={{ scale: 0 }}` do botao (evitar re-animar se por algum motivo re-montar)
- Ou manter, ja que agora nao vai re-montar

## Detalhe Tecnico

### Novo componente: `ProtectedLayoutRoute`
Combina `ProtectedRoute` + `AppLayout` + `<Outlet />`:

```text
function ProtectedLayoutRoute() {
  // auth checks (user, mfa, org selection, onboarding, trial)
  // ...
  return (
    <AppLayout userName={...} organizationName={...}>
      <Outlet />
    </AppLayout>
  );
}
```

### App.tsx (estrutura final)
```text
<Routes>
  {/* Public */}
  <Route path="/" element={<Login />} />
  ...

  {/* Protected (layout persistente) */}
  <Route element={<ProtectedLayoutRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/leads" element={<Leads />} />
    <Route path="/clients" element={<Clients />} />
    ...todas as rotas protegidas...
  </Route>

  {/* Super Admin (layout proprio) */}
  <Route element={<SuperAdminLayoutRoute />}>
    <Route path="/system-admin" element={<SystemAdminDashboard />} />
    ...
  </Route>
</Routes>
```

## Resultado
- Sidebar, Header, MobileBottomNav e Otto **nunca re-montam** ao navegar
- Verificacao de subscricao executa **uma vez**
- Navegacao instantanea e fluida
- Zero impacto visual (flash/flicker)

