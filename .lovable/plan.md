
# Remover "Formulário Público" das Integrações

## Resumo

Remover a secção "Formulário Público" (link direto, iframe, chave pública) do `IntegrationsContent.tsx`, já que os formulários têm o seu próprio sub-módulo dedicado em Definições Gerais > Formulário.

## Alterações

### 1. `src/components/settings/IntegrationsContent.tsx`

- Remover o `AccordionItem value="form"` completo (linhas 132-181) que contém o link direto, código iframe e chave pública
- Remover as props `publicFormUrl`, `iframeCode`, `copied`, `copyToClipboard` da interface `IntegrationsContentProps` (já não são necessárias aqui)
- Remover imports não utilizados após a remoção: `Code`, `Copy`, `Check`, `ExternalLink` (verificar se são usados noutro local do ficheiro antes de remover)

### 2. `src/pages/Settings.tsx`

- Remover as props `publicFormUrl`, `iframeCode`, `copied`, `copyToClipboard` do objecto `integrationsContentProps`
- Remover o estado `copied` e `setCopied` e a função `copyToClipboard` se já não forem usados em mais lado nenhum (verificar antes)
- Remover o cálculo de `publicFormUrl`, `iframeCode` e `formMode`/`formPrefix` se já não forem referenciados

### Sem alterações em
- Nenhum componente de conteúdo (FormsManager, etc.)
- Nenhuma lógica de backend
