
Objetivo

Uniformizar os modais padrão do sistema para que deixem de aparecer “largos demais”, mantendo consistência visual entre eles sem mexer nos modais full-screen.

O que identifiquei

- O componente base `DialogContent` já tem um padrão global relativamente equilibrado:
  - `w-full`
  - `max-w-lg`
  - `max-w-[calc(100vw-2rem)]`
- O problema principal não está no componente base, mas sim em vários modais que sobrescrevem essa largura com valores diferentes:
  - pequenos: `max-w-sm`, `max-w-md`
  - médios: `max-w-lg`
  - largos: `max-w-2xl`, `max-w-3xl`, `max-w-4xl`, `sm:max-w-[600px]`, `sm:max-w-[700px]`
- Há também modais full-screen com `variant="fullScreen"`, mas como indicou “Só modais normais”, esses não devem ser alterados.

Casos que hoje parecem maiores do que o necessário

Encontrei modais normais com larguras bem acima do padrão:
- `src/components/finance/CommissionsPayableModal.tsx` → `max-w-4xl`
- `src/components/finance/CloseMonthModal.tsx` → `max-w-4xl`
- `src/components/marketing/EditTemplateModal.tsx` → `max-w-3xl`
- `src/components/marketing/CreateTemplateModal.tsx` → `max-w-3xl`
- `src/components/ecommerce/ProductVariantsModal.tsx` → `sm:max-w-[700px]`
- `src/components/ecommerce/EditProductModal.tsx` → `sm:max-w-[600px]`
- `src/components/finance/SubmitRequestModal.tsx` / `ReviewRequestModal.tsx` / `ClientDetailsModal.tsx` / `SendTemplateModal.tsx` usam `max-w-lg`, que já está alinhado com o padrão base e provavelmente não precisam de grande ajuste.

Abordagem proposta

1. Definir um padrão simples para modais normais
- Manter três tamanhos práticos:
  - pequeno: `max-w-md`
  - médio: `max-w-lg`
  - largo controlado: `max-w-xl` ou `max-w-2xl` apenas quando o conteúdo realmente justificar
- Evitar `max-w-3xl` e `max-w-4xl` em modais normais.

2. Uniformizar os modais hoje exagerados
- Reduzir os modais mais largos para uma largura consistente.
- Prioridade:
  - modais de formulário e revisão → `max-w-lg`
  - modais com tabela/resumo maior → `max-w-xl` ou `max-w-2xl` no máximo
- Assim, ficam mais uniformes sem comprimir demasiado conteúdos mais densos.

3. Preservar responsividade
- Manter o comportamento móvel atual:
  - largura limitada ao viewport
  - `max-w-[calc(100vw-2rem)]`
  - scroll vertical quando necessário
- Ou seja: a uniformização será sobretudo no desktop.

4. Não mexer nos full-screen
- Todos os `DialogContent variant="fullScreen"` ficam como estão.
- Isso evita quebrar fluxos complexos como leads, propostas, campanhas, imports, etc.

Resultado esperado

- Os modais normais passam a ter uma linguagem visual mais consistente.
- Os que hoje “abrem enormes” deixam de ocupar largura excessiva.
- O sistema fica mais limpo e previsível, sem afetar modais de ecrã inteiro.

Ficheiros mais prováveis para ajuste

- `src/components/finance/CommissionsPayableModal.tsx`
- `src/components/finance/CloseMonthModal.tsx`
- `src/components/marketing/EditTemplateModal.tsx`
- `src/components/marketing/CreateTemplateModal.tsx`
- `src/components/ecommerce/ProductVariantsModal.tsx`
- `src/components/ecommerce/EditProductModal.tsx`

Detalhe técnico

A forma mais segura é:
- manter `src/components/ui/dialog.tsx` como base global;
- ajustar apenas os modais normais que estão a sobrescrever com larguras excessivas;
- usar uma escala curta e consistente de tamanhos (`md`, `lg`, `xl` / no máximo `2xl`) para reduzir variação visual entre módulos.
