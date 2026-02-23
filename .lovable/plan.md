

# Onboarding Wizard para Novos Clientes

## Resumo
Quando um novo cliente faz login pela primeira vez, se a organização não tem pipeline configurado (0 etapas na tabela `pipeline_stages`), aparece um wizard de onboarding em ecrã inteiro que guia o utilizador por 3 passos:

1. **Selecionar o Pipeline** (tipo de negócio/nicho)
2. **Tutorial sobre Formulários** (explicação de como funcionam os formulários de captura de leads)
3. **Criar o primeiro formulário** (configuração básica do formulário principal)

## Passos do Wizard

### Passo 1 - Escolher o Pipeline
- Cards visuais com os 6 nichos disponíveis (Genérico, Clínica, Construção, Telecom, E-commerce, Imobiliário)
- Cada card mostra o ícone, nome, descrição e uma pré-visualização das etapas
- Ao selecionar, aplica o template de pipeline e módulos associados

### Passo 2 - Tutorial de Formulários
- Explicação visual do que são os formulários de captura
- Como funciona: Lead preenche -> entra no Kanban automaticamente
- Mostra o URL público do formulário (ex: `senvia.app/f/slug`)
- Explicação de que podem usar em Landing Pages e anúncios

### Passo 3 - Criar Primeiro Formulário
- Nome do formulário (pré-preenchido com base no nicho, ex: "Formulário Principal")
- O formulário default é criado automaticamente
- Botão "Concluir" que redireciona para o Dashboard

## Alterações Técnicas

### 1. Novo componente: `src/components/onboarding/OnboardingWizard.tsx`
- Componente de ecrã inteiro com os 3 passos
- Usa `usePipelineStages` para verificar se tem etapas
- Usa `useApplyNicheTemplate` para aplicar o pipeline selecionado
- Usa `useCreateForm` para criar o primeiro formulário
- Design dark mode, mobile-first, estilo consistente com o resto da app

### 2. Alterar: `src/components/auth/ProtectedRoute.tsx`
- Adicionar verificação: se a organização existe mas não tem pipeline stages (niche não configurado), mostrar o `OnboardingWizard` em vez do conteúdo normal
- A verificação usa o hook `usePipelineStages` -- se retornar array vazio (e não estiver loading), mostra o wizard
- O wizard só aparece para utilizadores com role `admin` (quem criou a conta)

### 3. Limpar pipeline existente da conta `freethiagosousa@gmail.com`
- Verificar qual organização pertence e eliminar pipeline_stages existentes (se houver)
- Resetar o niche para `null` na tabela organizations

### 4. Alterar: `create_organization_for_current_user` (SQL)
- Garantir que o niche é criado como `NULL` em vez de `'generic'` para que o wizard seja acionado
- Não criar pipeline stages automaticamente (já é o caso atual)

## Fluxo Completo

```text
Login -> ProtectedRoute verifica:
  1. Autenticado? (se não -> Login)
  2. MFA pendente? (se sim -> Challenge)
  3. Múltiplas orgs? (se sim -> Selector)
  4. Pipeline configurado? (se não + admin -> Onboarding Wizard)
  5. Trial expirado? (se sim -> Blocker)
  6. Tudo OK -> Dashboard/Página
```

## O que NAO muda
- PipelineEditor nas Definições continua a funcionar normalmente
- Utilizadores convidados (não-admin) não veem o wizard
- Organizações já configuradas não são afetadas

