

# Remover Landing Page e Tornar Login a Pagina Inicial

## O que muda

A rota `/` passa a mostrar diretamente a pagina de Login/Registo. A landing page interna e todos os seus componentes sao removidos. Os links que apontavam para `/login` ou `/` continuam a funcionar normalmente.

## Alteracoes

### 1. Rota principal (`src/App.tsx`)
- Remover a rota `<Route path="/" element={<Landing />} />`
- Alterar a rota do Login de `/login` para `/`
- Manter a rota `/login` como redirect para `/` (para nao partir links existentes)
- Remover o import do componente `Landing`

### 2. Redirects e navegacao
Atualizar todos os ficheiros que referenciam `/login` ou `/` para garantir consistencia:

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/auth/ProtectedRoute.tsx` | `Navigate to="/"` -- ja esta correto, agora aponta para login |
| `src/components/auth/SuperAdminRoute.tsx` | `Navigate to="/"` -- ja esta correto |
| `src/components/layout/AppSidebar.tsx` | `navigate('/')` no logout -- ja esta correto |
| `src/components/layout/MobileMenu.tsx` | `navigate('/')` no logout -- ja esta correto |
| `src/pages/ResetPassword.tsx` | `navigate('/')` -- ja esta correto |
| `src/pages/InviteRegister.tsx` | Links para `/login` mudam para `/` |
| `src/pages/Install.tsx` | Link para `/login` muda para `/` |
| `src/pages/NotFound.tsx` | Link para `/` -- ja esta correto |
| `src/pages/Privacy.tsx` | Link para `/` -- ja esta correto |
| `src/pages/Terms.tsx` | Link para `/` -- ja esta correto |

### 3. Remover ficheiros da landing page
Eliminar todos os componentes que ja nao sao usados:

- `src/pages/Landing.tsx`
- `src/components/landing/AnnouncementBar.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/SocialProofBar.tsx`
- `src/components/landing/ProblemSection.tsx`
- `src/components/landing/SolutionSteps.tsx`
- `src/components/landing/DemoShowcase.tsx`
- `src/components/landing/FeaturesGrid.tsx`
- `src/components/landing/AISection.tsx`
- `src/components/landing/NichesSection.tsx`
- `src/components/landing/ResultsSection.tsx`
- `src/components/landing/TestimonialsSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/ComparisonTable.tsx`
- `src/components/landing/TrustSection.tsx`
- `src/components/landing/FAQSection.tsx`
- `src/components/landing/FinalCTA.tsx`
- `src/components/landing/LandingFooter.tsx`

### 4. Pagina de Login (`src/pages/Login.tsx`)
- Nenhuma alteracao funcional necessaria -- o componente ja funciona de forma independente
- O parametro `?tab=signup` continua a funcionar para abrir diretamente no registo

## Resultado final

```text
Utilizador acede senvia-portugal-crm.lovable.app
  -> Ve diretamente a pagina de Login/Registo
  -> Pode fazer login ou clicar em "Criar Conta" para o trial de 14 dias
  -> Apos login, vai para /dashboard
  -> Logout redireciona de volta para /
```

## O que NAO muda
- Todo o fluxo de registo, trial de 14 dias e billing
- As rotas protegidas e redirects de autenticacao
- O formulario publico de leads (`/f/:slug`)
- As paginas de Privacy e Terms
