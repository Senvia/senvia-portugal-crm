

## Sincronizar Produtos com InvoiceXpress

### Objetivo
Permitir importar/sincronizar o catalogo de itens do InvoiceXpress com os produtos do Senvia OS, garantindo que ambos os sistemas estao alinhados.

### Fluxo do Utilizador

```text
Definicoes > Produtos & Servicos
    |
    v
[Botao "Sincronizar com InvoiceXpress"]
    |
    v
Edge Function GET /items.json (todas as paginas)
    |
    v
Compara com produtos locais (por invoicexpress_id ou nome)
    |
    v
- Produtos novos no InvoiceXpress -> Cria no Senvia
- Produtos existentes -> Atualiza preco/descricao/IVA
- Produtos so no Senvia -> Mantidos (nao apaga)
    |
    v
Toast com resumo: "3 criados, 2 atualizados"
```

### Alteracoes Tecnicas

**1. Migracao de Base de Dados**

Adicionar coluna `invoicexpress_id` a tabela `products` para mapear com o InvoiceXpress:

```sql
ALTER TABLE public.products ADD COLUMN invoicexpress_id integer DEFAULT NULL;
```

**2. Nova Edge Function `sync-invoicexpress-items`**

Ficheiro: `supabase/functions/sync-invoicexpress-items/index.ts`

Responsabilidades:
- Receber `organization_id`
- Verificar autenticacao e membership
- Buscar credenciais InvoiceXpress da organizacao
- Paginar `GET /items.json?page=X&per_page=30` ate obter todos os itens
- Para cada item do InvoiceXpress:
  - Se ja existe produto local com `invoicexpress_id` igual: atualizar nome, preco, IVA
  - Se nao existe: criar novo produto com os dados do item
- Mapear campos: `name`, `description`, `unit_price` -> `price`, `tax.value` -> `tax_value`
- Retornar resumo: `{ created: N, updated: N, total: N }`

**3. Novo Hook `useSyncInvoiceXpressItems`**

Ficheiro: `src/hooks/useSyncInvoiceXpressItems.ts`

- Mutation que chama a edge function `sync-invoicexpress-items`
- Invalida query `['products']` apos sucesso
- Mostra toast com resumo da sincronizacao

**4. Atualizar `ProductsTab.tsx`**

- Adicionar botao "Sincronizar" (icone RefreshCw) ao lado do botao "Adicionar"
- Botao visivel apenas se a integracao InvoiceXpress esta ativa
- Loading spinner durante a sincronizacao
- Necessita aceder ao estado da organizacao para verificar credenciais

**5. Atualizar tipo `Product`**

Adicionar `invoicexpress_id?: number | null` a interface `Product` em `src/types/proposals.ts`.

**6. Registar edge function**

Adicionar `sync-invoicexpress-items` ao `supabase/config.toml` com `verify_jwt = false`.

### Resumo de Ficheiros

| Ficheiro | Acao | Descricao |
|---|---|---|
| Migracao SQL | Criar | Adicionar `invoicexpress_id` a `products` |
| `supabase/functions/sync-invoicexpress-items/index.ts` | Criar | Edge function de sincronizacao |
| `supabase/config.toml` | Editar | Registar nova function |
| `src/hooks/useSyncInvoiceXpressItems.ts` | Criar | Hook com mutation de sync |
| `src/types/proposals.ts` | Editar | Adicionar `invoicexpress_id` ao tipo Product |
| `src/components/settings/ProductsTab.tsx` | Editar | Botao "Sincronizar" |

### Secao Tecnica - Logica de Sync

A edge function percorre todas as paginas de itens do InvoiceXpress:

```text
page = 1
loop:
  GET /items.json?page=X&per_page=30
  processar itens
  se total_pages > page: page++
  senao: sair
```

Para cada item:
1. Procurar produto local com `invoicexpress_id = item.id`
2. Se encontrado: `UPDATE products SET name, price, tax_value WHERE invoicexpress_id = item.id`
3. Se nao encontrado: `INSERT INTO products (name, description, price, tax_value, invoicexpress_id, organization_id)`
4. O campo `tax_value` e mapeado de `item.tax.value` (ex: 23 para IVA23, 0 para Isento)

