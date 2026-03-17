
Estado atual

Ainda não. Pelo código atual, os modais largos continuam com larguras acima do padrão, por isso o ajuste não foi aplicado ainda.

O que confirmei no código

Ainda existem estes modais normais com larguras excessivas:
- `src/components/finance/CommissionsPayableModal.tsx` → `max-w-4xl`
- `src/components/finance/CloseMonthModal.tsx` → `max-w-4xl`
- `src/components/marketing/CreateTemplateModal.tsx` → `max-w-3xl`
- `src/components/marketing/EditTemplateModal.tsx` → `max-w-3xl`
- `src/components/ecommerce/ProductVariantsModal.tsx` → `sm:max-w-[700px]`
- `src/components/ecommerce/OrderDetailsModal.tsx` → `sm:max-w-[700px]`
- `src/components/ecommerce/EditProductModal.tsx` → `sm:max-w-[600px]`
- `src/components/ecommerce/CreateProductModal.tsx` → `sm:max-w-[600px]`
- `src/components/ecommerce/ProductImagesModal.tsx` → `sm:max-w-[600px]`

Base atual
- `src/components/ui/dialog.tsx` já usa um padrão bom para modal normal: `max-w-lg`
- O problema vem das sobrescritas locais nos componentes acima

Plano de correção

1. Manter a base global como está
- Não mexer no `DialogContent` base
- Não mexer em modais `fullScreen`

2. Uniformizar só os modais normais que estão maiores do que deviam
- Formulários e edição simples → `max-w-lg`
- Conteúdo mais denso/listagens → no máximo `max-w-2xl`
- Eliminar `max-w-3xl` e `max-w-4xl` desses modais normais

3. Ajuste por ficheiro
- `CreateTemplateModal` / `EditTemplateModal` → reduzir de `3xl` para `2xl` ou `lg` conforme o editor
- `CommissionsPayableModal` / `CloseMonthModal` → reduzir de `4xl` para `2xl`
- `ProductVariantsModal` / `OrderDetailsModal` → trocar `700px` por largura padronizada
- `CreateProductModal` / `EditProductModal` / `ProductImagesModal` → alinhar com `lg`

Resultado esperado

- Todos os modais normais passam a abrir com largura consistente
- Nada “salta” demasiado no desktop
- Mobile continua responsivo porque o limite por viewport já existe

Resumo direto

Não, ainda não ficou corrigido no código atual. O próximo passo é aplicar essa padronização nesses ficheiros específicos.