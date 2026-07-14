# inbox-products-panel - Work Plan

## TL;DR (For humans)

**What you'll get:** Cada produto/serviço no Senvia passa a ter fotografias. Dentro de uma conversa no Inbox, o painel direito mostra todos os produtos/serviços cadastrados (com foto, nome e preço). Com 1 clique, envias a foto + nome + preço + descrição diretamente para o cliente na conversa.

**Why this approach:** Hoje o painel do inbox usa a tabela errada (`ecommerce_products`, a loja online). Os teus produtos estão na tabela `products`. Vamos criar uma tabela nova `service_images` para as fotos (porque a tabela `product_images` existente tem uma restrição que a impede de ser usada para `products`), adicionar upload de fotos ao formulário de produtos, e reescrever o painel do inbox para usar a tabela certa.

**What it will NOT do:**
- Não mexe na loja online (ecommerce_products) nem no picker do e-commerce
- Não adiciona imagens às propostas ou linhas de venda
- Não cria um novo bucket de storage (reutiliza `product-images` existente)
- Não modifica a tabela `product_images` existente nem a sua restrição (FK)

**Effort:** Medium (4 ondas, ~7 tarefas)
**Risk:** Low — feature isolada, sem impacto em fluxos existentes. Tabela nova não partilha FK com nada existente.
**Decisions to sanity-check:** Nome da tabela nova (`service_images`), reutilização do bucket `product-images`.

Your next move: aprovar e mandar executar, ou pedir revisão de alta precisão primeiro. Detalhe completo abaixo.

---

> TL;DR (machine): Medium effort, Low risk. 4 waves, 7 todos. New `service_images` table + product form images + inbox picker rewrite to `products` table.

## Scope
### Must have
- Tabela `service_images` com RLS (multi-tenancy via `organization_id`)
- Hooks para CRUD de imagens de produtos (`useServiceImages`, upload, delete, set primary)
- Upload de múltiplas imagens no `CreateProductModal` e `EditProductModal`
- Painel do inbox reescrito para usar `useActiveProducts()` (tabela `products`)
- Envio com 1 clique (foto + nome + preço + descrição) adaptado para `service_images`
- TypeScript types atualizados
- Supabase types regenerados

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NÃO modificar a tabela `product_images` nem a sua FK para `ecommerce_products`
- NÃO alterar o fluxo de e-commerce existente
- NÃO adicionar coluna `image_url` diretamente à tabela `products` (usar tabela relacional)
- NÃO criar novo storage bucket — reutilizar `product-images`
- NÃO adicionar campos de e-commerce (tags, slug, sku) aos produtos
- NÃO partir o `InboxProductPicker` existente se for usado noutro sítio

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: none (projeto não tem test suite; verificação manual + `npx tsc --noEmit --skipLibCheck`)
- Evidence: `.omo/evidence/task-N-inbox-products-panel.<ext>`

## Execution strategy
### Parallel execution waves

**Wave 1 (DB + Types):** Migration SQL + types + hooks base
**Wave 2 (Forms):** Image upload UI nos modais de criar/editar produto
**Wave 3 (Inbox):** Rewrite picker + send mechanism
**Wave 4 (Verify):** TypeScript check + regenerate supabase types

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 (SQL migration) | — | 2, 3, 5 | — |
| 2 (TypeScript types) | 1 | 3, 4, 5 | — |
| 3 (Image hooks) | 1, 2 | 4, 5 | — |
| 4 (Product form images) | 2, 3 | — | 5 |
| 5 (Inbox picker rewrite) | 2, 3 | 6 | 4 |
| 6 (Send mechanism) | 2, 3, 5 | — | — |
| 7 (Verify + supabase types) | ALL | — | — |

## Todos
> Implementation + Test = ONE todo. Never separate.

- [ ] 1. Criar tabela `service_images` + RLS + storage policy
  What to do / Must NOT do:
  - Criar migration SQL em `supabase/migrations/<timestamp>_service_images.sql`
  - Tabela `service_images` com colunas: `id (uuid PK)`, `product_id (uuid FK → products.id ON DELETE CASCADE)`, `organization_id (uuid FK → organizations.id)`, `url (text)`, `alt_text (text null)`, `position (int default 0)`, `is_primary (bool default false)`, `created_at (timestamptz default now())`
  - RLS enabled com policy `is_org_member(auth.uid(), organization_id)` para SELECT, INSERT, UPDATE, DELETE
  - Índice em `(product_id, position)` e `(organization_id)`
  - NÃO modificar a tabela `product_images` existente
  - NÃO criar novo storage bucket — usar `product-images` existente
  Must NOT do: não adicionar `organization_id` como nullable — deve ser NOT NULL para RLS funcionar
  Parallelization: Wave 1 | Blocked by: none | Blocks: 2, 3, 5
  References:
  - `src/integrations/supabase/types.ts:3350-3387` (product_images schema para referência)
  - `src/integrations/supabase/types.ts:3444-3474` (products table schema)
  - `agent_docs/database_schema.md` (RLS patterns: `is_org_member`)
  Acceptance criteria: Migration SQL escrita e pronta para correr no Supabase SQL Editor. Deve incluir `CREATE TABLE`, `ENABLE ROW LEVEL SECURITY`, `CREATE POLICY` para SELECT/INSERT/UPDATE/DELETE, e `CREATE INDEX`.
  QA scenarios: Verificar que o SQL é válido (sem erros de sintaxe), que todas as policies usam `is_org_member`, e que `ON DELETE CASCADE` está no FK para products. Evidence: `.omo/evidence/task-1-inbox-products-panel.sql`
  Commit: Y | Feat(db): adiciona tabela service_images para imagens de produtos/servicos

- [ ] 2. Atualizar TypeScript types para `service_images`
  What to do / Must NOT do:
  - Adicionar interface `ServiceImage` em `src/types/proposals.ts` (mesmo ficheiro do `Product`):
    ```typescript
    export interface ServiceImage {
      id: string;
      product_id: string;
      organization_id: string;
      url: string;
      alt_text?: string | null;
      position: number;
      is_primary: boolean;
      created_at: string;
    }
    ```
  - NÃO adicionar a `src/types/ecommerce.ts` (esse é para e-commerce)
  Must NOT do: não modificar o `ProductImage` type existente
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 3, 4, 5
  References:
  - `src/types/proposals.ts:8-26` (interface Product existente)
  - `src/types/ecommerce.ts:34-42` (ProductImage para referência de estrutura)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` passa sem erros após adicionar a interface.
  QA scenarios: TypeScript compila. Evidence: `.omo/evidence/task-2-inbox-products-panel.txt`
  Commit: Y | Feat(types): adiciona ServiceImage type

- [ ] 3. Criar hooks de imagens para produtos (`useServiceImages`)
  What to do / Must NOT do:
  - Criar `src/hooks/useServiceImages.ts` com hooks:
    - `useServiceImages(productId)` → query de imagens de um produto, ordenadas por `is_primary DESC, position ASC`
    - `useUploadServiceImage()` → mutation: upload para bucket `product-images` path `<productId>/<uuid>.<ext>`, depois INSERT em `service_images` com `organization_id`, `url` (public URL), `is_primary`, `position`
    - `useDeleteServiceImage()` → mutation: extrair path da URL, remover do storage, DELETE de `service_images`
    - `useSetPrimaryServiceImage()` → mutation: unset outros primaries do mesmo produto, set novo primary
  - Seguir EXATAMENTE o padrão de `src/hooks/ecommerce/useProductImages.ts` mas com tabela `service_images`
  Must NOT do: não usar a tabela `product_images`; não criar novo bucket
  Parallelization: Wave 1 | Blocked by: 1, 2 | Blocks: 4, 5
  References:
  - `src/hooks/ecommerce/useProductImages.ts:1-199` (padrão completo a seguir)
  - `src/integrations/supabase/client.ts` (supabase client)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` passa. Hooks exportados e tipados corretamente com `ServiceImage`.
  QA scenarios: TypeScript compila. Evidence: `.omo/evidence/task-3-inbox-products-panel.txt`
  Commit: Y | Feat(hooks): adiciona useServiceImages para CRUD de imagens de produtos

- [ ] 4. Adicionar upload de imagens ao CreateProductModal e EditProductModal
  What to do / Must NOT do:
  - Em `CreateProductModal.tsx`: após criar o produto com sucesso, abrir modo de edição para upload de imagens, OU criar o produto e imediatamente permitir upload (precisa do product.id primeiro)
  - Em `EditProductModal.tsx`: adicionar secção de galeria de imagens:
    - Grid de thumbnails das imagens existentes (usar `useServiceImages(product.id)`)
    - Botão "Adicionar imagem" que abre file picker
    - Cada thumbnail tem botão de eliminar e botão "definir como principal"
    - Upload via `useUploadServiceImage()`
    - Indicador de loading durante upload
  - Tornar o modal um pouco mais largo (`sm:max-w-lg` em vez de `sm:max-w-md`) para acomodar a galeria
  - A primeira imagem uploaded é automaticamente `is_primary = true`
  Must NOT do: não bloquear o save do produto por causa de imagens; não adicionar limite máximo de imagens (permitir ilimitadas)
  Parallelization: Wave 2 | Blocked by: 2, 3 | Blocks: nothing
  References:
  - `src/components/settings/CreateProductModal.tsx:1-165` (modal de criação atual)
  - `src/components/settings/EditProductModal.tsx:1-190` (modal de edição atual)
  - `src/hooks/useProducts.ts:46-77` (useCreateProduct — retorna product.id necessário para upload)
  - `src/components/ecommerce/EditProductModal.tsx` (referência de como o e-commerce faz upload de imagens)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` passa. Modal de editar produto mostra galeria, permite upload, delete, e set primary. Modal de criar produto redireciona para editar após criar (ou mostra upload inline).
  QA scenarios: TypeScript compila. Evidence: `.omo/evidence/task-4-inbox-products-panel.txt`
  Commit: Y | Feat(products): upload de multiplas imagens no cadastro/edicao de produtos

- [ ] 5. Reescrever InboxProductPicker para usar tabela `products`
  What to do / Must NOT do:
  - Em `InboxProductPicker.tsx`:
    - Trocar `useActiveEcommerceProducts` → `useActiveProducts` (de `@/hooks/useProducts`)
    - Trocar tipo `EcommerceProduct` → `Product` (de `@/types/proposals`)
    - Trocar `useProductImages` → `useServiceImages` (para buscar imagens)
    - Remover filtro de categorias (products não tem category_id)
    - Remover filtro por tags (products não tem tags)
    - Manter: pesquisa por nome/descrição, grid de produtos, scroll area
  - Em `InboxProductSection`:
    - Trocar tipo `EcommerceProduct` → `Product`
    - Manter o comportamento collapsible e o "ver todos"
  - Atualizar a prop `onSelectProduct` para receber `Product`
  Must NOT do: não apagar o `InboxProductPicker` — reescrever; não mexer no e-commerce
  Parallelization: Wave 2 | Blocked by: 2, 3 | Blocks: 6
  References:
  - `src/components/inbox/InboxProductPicker.tsx:1-285` (ficheiro completo a reescrever)
  - `src/hooks/useProducts.ts:26-44` (useActiveProducts)
  - `src/types/proposals.ts:8-26` (interface Product)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` passa. Componente compila com `Product` type em vez de `EcommerceProduct`.
  QA scenarios: TypeScript compila. Evidence: `.omo/evidence/task-5-inbox-products-panel.txt`
  Commit: Y | Refactor(inbox): product picker usa tabela products em vez de ecommerce

- [ ] 6. Adaptar useSendProductInbox para `products` + `service_images`
  What to do / Must NOT do:
  - Em `src/hooks/inbox/useSendProductInbox.ts`:
    - Trocar tipo `EcommerceProduct` → `Product`
    - Trocar query de `product_images` → `service_images` na busca da imagem principal
    - Adaptar a construção da mensagem de texto: `product.short_description` não existe em `Product` → usar `product.description`
    - O resto da lógica (fetch imagem → base64 → attachment → send) mantém-se igual
  - Em `Inbox.tsx:3092-3105`: a chamada já passa `product` — só precisa do tipo atualizado
  Must NOT do: não alterar o `OutgoingAttachment` type; não mudar a API do hook `useSendInboxMessage`
  Parallelization: Wave 3 | Blocked by: 2, 3, 5 | Blocks: nothing
  References:
  - `src/hooks/inbox/useSendProductInbox.ts:1-110` (ficheiro completo)
  - `src/hooks/useChatwootInbox.ts` (useSendInboxMessage, OutgoingAttachment type)
  - `src/lib/format.ts:54` (formatCurrency)
  - `src/pages/Inbox.tsx:3092-3105` (onde é chamado)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` passa. Hook aceita `Product` type e busca imagem de `service_images`.
  QA scenarios: TypeScript compila. Evidence: `.omo/evidence/task-6-inbox-products-panel.txt`
  Commit: Y | Refactor(inbox): useSendProductInbox adaptado para products + service_images

- [ ] 7. Verificação final + regenerate Supabase types
  What to do / Must NOT do:
  - Correr a migration SQL no Supabase SQL Editor (manual — o projeto não usa CLI migration runner)
  - Regenerar Supabase types: `npx supabase gen types typescript --project-ref chhmfwlimtbsyjmgtokn > src/integrations/supabase/types.ts` (ou atualizar manualmente adicionando `service_images` ao types.ts)
  - Verificar `npx tsc --noEmit --skipLibCheck` sem erros
  - Verificar que o painel de produtos aparece no inbox quando há produtos cadastrados
  - Verificar que enviar um produto funciona (texto + imagem)
  Must NOT do: não fazer deploy sem verificar TypeScript
  Parallelization: Wave 4 | Blocked by: ALL | Blocks: nothing
  References:
  - `CLAUDE.md` (instruções de verificação: `npx tsc --noEmit --skipLibCheck`)
  - `src/integrations/supabase/types.ts` (ficheiro a regenerar/atualizar)
  Acceptance criteria: TypeScript compila sem erros. Tabela `service_images` existe na BD. Supabase types inclui `service_images`.
  QA scenarios: `npx tsc --noEmit --skipLibCheck` → zero erros. Evidence: `.omo/evidence/task-7-inbox-products-panel.txt`
  Commit: Y | Chore: regenerate supabase types + verificacao final

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
- [ ] F2. Code quality review
- [ ] F3. Real manual QA
- [ ] F4. Scope fidelity

## Commit strategy
Commits em português, prefixados:
1. `Feat(db): adiciona tabela service_images para imagens de produtos/servicos`
2. `Feat(types): adiciona ServiceImage type`
3. `Feat(hooks): adiciona useServiceImages para CRUD de imagens de produtos`
4. `Feat(products): upload de multiplas imagens no cadastro/edicao de produtos`
5. `Refactor(inbox): product picker usa tabela products em vez de ecommerce`
6. `Refactor(inbox): useSendProductInbox adaptado para products + service_images`
7. `Chore: regenerate supabase types + verificacao final`

Ou commit único no final: `Feat: catalogo de produtos com imagens no inbox multicanal`

## Success criteria
1. Tabela `service_images` existe na BD com RLS ativo e policies corretas
2. É possível fazer upload de múltiplas imagens ao criar/editar um produto
3. O painel direito do inbox mostra os produtos/serviços da tabela `products`
4. Clicar num produto envia foto + nome + preço + descrição para a conversa
5. Produtos sem imagem enviam só texto (nome + preço + descrição)
6. TypeScript compila sem erros
7. O fluxo de e-commerce existente não foi afetado
