

# Corrigir Fluxo de Registo para Novos Clientes (Trial 14 Dias)

## Problema Atual

O site de vendas diz "Testar Gratis 14 Dias" e envia o utilizador para `/login`. Mas o formulario de registo em `/login` tem dois bloqueios:

1. **Codigo de Registo obrigatorio** -- O campo exige o codigo secreto `4330`, que o cliente nao tem. O texto diz "Contacte-nos para obter o seu" -- isto mata completamente a conversao.
2. **Experiencia confusa** -- O cliente chega a uma pagina de login (tab "Entrar" ativa por defeito) em vez de ver um formulario de registo limpo e focado.

## Solucao

### 1. Remover o campo "Codigo de Registo"

Eliminar completamente o campo `registrationCode` do formulario de signup. O registo passa a ser aberto para qualquer pessoa -- exatamente o que o modelo de negocio precisa (trial gratuito de 14 dias, a conversao acontece depois).

- Remover o campo do formulario
- Remover a validacao `registrationCode` do schema Zod
- Remover o state `registrationCode`

### 2. CTAs do site apontam para `/login?tab=signup`

Atualmente os botoes "Testar Gratis" apontam para `/login`. O formulario ja suporta o query param `?tab=signup` (linha 59 do Login.tsx), por isso basta alterar todos os links de `/login` para `/login?tab=signup` nos componentes da landing page:

- `HeroSection.tsx` -- CTA principal
- `PricingSection.tsx` -- Botoes de cada plano
- `FinalCTA.tsx` -- CTA final
- `LandingHeader.tsx` -- Botao "Testar Gratis" no header

### 3. Melhorar o formulario de signup

Tornar o formulario mais acolhedor para novos clientes:

- Titulo do card muda para "Comece o seu teste gratis" quando a tab signup esta ativa
- Adicionar badge "14 dias gratis, sem cartao" no topo do formulario de registo
- Simplificar a descricao do campo "Slug" para algo mais claro como "Endereco da sua empresa" em vez de "Slug (URL da empresa)"

## Detalhes Tecnicos

### Ficheiros a alterar:

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/Login.tsx` | Remover campo `registrationCode`, remover validacao do schema, melhorar textos |
| `src/components/landing/HeroSection.tsx` | Link de `/login` para `/login?tab=signup` |
| `src/components/landing/PricingSection.tsx` | Link de `/login` para `/login?tab=signup` |
| `src/components/landing/FinalCTA.tsx` | Link de `/login` para `/login?tab=signup` |
| `src/components/landing/LandingHeader.tsx` | Link de `/login` para `/login?tab=signup` |

### Fluxo do novo cliente apos a correcao:

```text
Site de vendas -> Clica "Testar Gratis 14 Dias"
  -> /login?tab=signup (tab de registo ja ativa)
    -> Preenche: Nome, Email, Palavra-passe, Nome da Empresa
    -> Confirma email (se auto-confirm esta desativado)
    -> Login -> Organizacao criada com trial_ends_at = now() + 14 dias
    -> Dashboard com TrialBanner a mostrar "14 dias restantes"
```

### O que NAO muda:
- A funcao `create_organization_for_current_user` ja cria a organizacao com `trial_ends_at` automaticamente (coluna tem DEFAULT `now() + interval '14 days'`)
- O login existente (com codigo da empresa) continua a funcionar para membros de equipa
- O `TrialBanner` e o `TrialExpiredBlocker` continuam a funcionar normalmente
- Nenhuma alteracao de base de dados necessaria

