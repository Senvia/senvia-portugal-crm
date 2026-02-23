

# Simplificar Login: Remover Campo "Codigo da Empresa"

## Problema Atual
O formulario de login pede 3 campos (email, password, codigo da empresa) mas o sistema ja resolve a organizacao automaticamente apos autenticacao:
- 1 organizacao: auto-seleciona
- Multiplas organizacoes: mostra ecra de selecao (OrganizationSelector)

O campo "Codigo da Empresa" e redundante e cria friccao desnecessaria.

## Alteracoes

### 1. Simplificar o Login (`src/pages/Login.tsx`)
- Remover o campo "Codigo da Empresa" do formulario de login
- Remover o estado `loginCompanyCode`
- Remover a validacao `companyCode` do schema de login
- Remover a chamada RPC `verify_user_org_membership` antes do login
- Simplificar o `handleLogin` para apenas: autenticar com email+password e redirecionar
- Deixar o AuthContext tratar da selecao de organizacao automaticamente
- Remover o `localStorage.setItem('senvia_active_organization_id')` manual (o AuthContext ja faz isso)

### 2. Atualizar o Schema de Validacao (`src/pages/Login.tsx`)
- O `loginSchema` passa a ter apenas `email` e `password`

### 3. Fluxo Resultante

```text
Login (email + password)
  -> AuthContext carrega organizacoes do utilizador
  -> 1 org: auto-seleciona e vai para /dashboard
  -> N orgs: mostra OrganizationSelector
  -> 0 orgs: redireciona para estado sem organizacao
```

### 4. Registo (sem alteracoes)
- O formulario de registo mantem o slug porque e necessario para CRIAR a organizacao
- O campo "Codigo da Empresa" (read-only) no registo pode ser removido tambem, ja que o slug e mostrado acima dele

## Secao Tecnica

### Ficheiro: `src/pages/Login.tsx`

**Remover:**
- Estado: `loginCompanyCode`, `setLoginCompanyCode`
- Schema: campo `companyCode` do `loginSchema`
- JSX: bloco do input "Codigo da Empresa" no formulario de login
- Logica: chamada RPC `verify_user_org_membership` e toda a logica de pre-verificacao
- Logica: `localStorage.setItem('senvia_active_organization_id', membership.organization_id)`

**Simplificar `handleLogin`:**
- Validar email + password
- Chamar `signIn(email, password)`
- Se sucesso, redirecionar para `/dashboard`
- O AuthContext trata automaticamente da selecao de organizacao

**Opcional - Remover do Registo:**
- O campo read-only "Codigo da Empresa" no formulario de registo (duplica informacao do slug)
- A nota "Anote este codigo" ja nao faz sentido se o login nao pede codigo

## O que NAO muda
- Formulario de registo (campos de organizacao mantidos para criacao)
- OrganizationSelector (continua a funcionar para multi-org)
- AuthContext (ja gere tudo automaticamente)
- Funcao RPC `verify_user_org_membership` (pode continuar no banco, nao causa problemas)
