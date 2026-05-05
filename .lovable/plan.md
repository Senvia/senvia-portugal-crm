## Objetivo
Fazer o botão **Importar** aparecer no ambiente live correto e eliminar a confusão entre o deploy oficial do projeto e o domínio `app.senvia.pt`.

## O que foi confirmado
- O botão **Importar** existe no código atual e está renderizado em `src/pages/Leads.tsx`.
- O projeto está publicado publicamente.
- O URL publicado oficial deste projeto é `senvia-portugal-crm.lovable.app`.
- Este projeto **não tem domínio customizado configurado** no momento.
- Ou seja: `app.senvia.pt` **não está ligado a este projeto** via publicação nativa.
- Além disso, o projeto tem vários links hardcoded para `https://app.senvia.pt`, o que mascara o ambiente real e dificulta validar se o deploy live é o correto.

## Plano
### 1. Parar de apontar “produção” cegamente para `app.senvia.pt`
- Rever `src/lib/constants.ts`.
- Remover a lógica que força preview/dev a usar `https://app.senvia.pt` como base.
- Passar a resolver a base URL a partir do host atual, com fallback explícito apenas quando necessário.
- Manter compatibilidade com formulários públicos, links e redirects.

### 2. Eliminar hardcodes de domínio espalhados no projeto
- Atualizar referências fixas a `app.senvia.pt` e `senvia-portugal-crm.lovable.app` onde fizer sentido para usar uma origem centralizada.
- Rever especialmente:
  - `public/embed.js`
  - `src/components/settings/*`
  - `src/components/forms/PublicLeadForm.tsx`
  - funções backend que geram links de email ou links públicos
- Padronizar para que o sistema use sempre o domínio realmente ativo do projeto.

### 3. Tornar o build live verificável na interface
- Substituir a versão meramente estática por um identificador de build/deploy visível.
- Exibir esse identificador em pontos fáceis de validar, como login/sidebar/menu mobile.
- Assim fica imediato perceber se o utilizador está a abrir o deploy certo ou um host antigo/paralelo.

### 4. Validar o botão no host certo
- Confirmar visualmente `/leads` autenticado no deploy oficial atualizado.
- Verificar se o cabeçalho mostra **Importar** e **Adicionar** lado a lado no breakpoint atual.
- Se ainda houver divergência, comparar o DOM/CSS do host oficial com o host `app.senvia.pt` para confirmar se o problema é de layout ou de deploy externo.

### 5. Separar problema de código vs problema de publicação/domínio
- Se o botão aparecer no deploy oficial e continuar ausente em `app.senvia.pt`, concluir formalmente que o problema não está mais no código deste projeto, mas sim no domínio externo que está a servir outra versão.
- Nesse caso, alinhar a publicação para um único domínio correto e evitar continuar a depurar a app errada.

## Resultado esperado
- O projeto deixa de depender de URLs hardcoded conflitantes.
- O live correto passa a ser identificável sem ambiguidade.
- O botão **Importar** aparece no deploy oficial atualizado.
- Se `app.senvia.pt` continuar diferente, ficará provado que esse domínio está fora deste fluxo de publicação e precisa ser reconfigurado.

## Detalhes técnicos
- Evidência principal: este projeto está publicado, mas **não possui domínio customizado configurado**, então `app.senvia.pt` não está ligado a esta publicação.
- Evidência secundária: o botão já está presente no código atual em `src/pages/Leads.tsx`.
- Evidência terciária: `APP_VERSION = '1.31.0'` é estático e, sozinho, não garante que dois hosts estejam a servir o mesmo build.
- Há ainda referências mistas a `app.senvia.pt` e ao domínio publicado oficial em frontend e backend, o que precisa ser unificado.

Aprova este plano e eu faço a correção.