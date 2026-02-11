

## Editar Produtos e Atualizar no InvoiceXpress (Bidirecional)

### Objetivo
Quando um produto com `invoicexpress_id` e editado no Senvia OS, enviar as alteracoes de volta para o InvoiceXpress via `PUT /items/:item-id.json`, mantendo ambos os sistemas sincronizados.

### Fluxo do Utilizador

```text
Definicoes > Produtos > Editar Produto (com invoicexpress_id)
    |
    v
Utilizador altera nome/preco/IVA -> Guardar
    |
    v
1. Atualiza localmente na BD (como ja funciona)
2. Se produto tem invoicexpress_id:
   -> Edge Function PUT /items/:id.json
   -> Atualiza no InvoiceXpress
    |
    v
Toast: "Produto atualizado (Senvia + InvoiceXpress)"
```

### Alteracoes Tecnicas

**1. Nova Edge Function `update-invoicexpress-item`**

Ficheiro: `supabase/functions/update-invoicexpress-item/index.ts`

Responsabilidades:
- Receber `organization_id`, `invoicexpress_id`, e dados do produto (`name`, `description`, `unit_price`, `tax`)
- Verificar autenticacao e membership
- Buscar credenciais InvoiceXpress da organizacao
- Chamar `PUT /items/:invoicexpress_id.json` com o body:
```json
{
  "item": {
    "name": "Nome do Produto",
    "description": "Descricao",
    "unit_price": 100.00,
    "tax": { "name": "IVA23", "value": 23 }
  }
}
```
- Mapear `tax_value` para o nome de taxa InvoiceXpress (23 -> "IVA23", 13 -> "IVA13", 6 -> "IVA6", 0 -> "Isento")
- Retornar sucesso ou erro

**2. Atualizar `useUpdateProduct` em `src/hooks/useProducts.ts`**

Apos o update local com sucesso, se o produto tem `invoicexpress_id`:
- Chamar a edge function `update-invoicexpress-item` para sincronizar
- Se a sincronizacao com InvoiceXpress falhar, mostrar aviso mas nao reverter o update local (o produto ja foi guardado)
- Toast diferenciado: "Produto atualizado" vs "Produto atualizado (sincronizado com InvoiceXpress)"

**3. Atualizar `supabase/config.toml`**

Registar `update-invoicexpress-item` com `verify_jwt = false`.

### Mapeamento de Taxas (Senvia -> InvoiceXpress)

| `tax_value` Senvia | `tax.name` InvoiceXpress |
|---|---|
| 23 | IVA23 |
| 13 | IVA13 |
| 6 | IVA6 |
| 0 | Isento |
| null | Nao envia (usa default da conta) |

### Resumo de Ficheiros

| Ficheiro | Acao | Descricao |
|---|---|---|
| `supabase/functions/update-invoicexpress-item/index.ts` | Criar | Edge function PUT para InvoiceXpress |
| `supabase/config.toml` | Editar | Registar nova function |
| `src/hooks/useProducts.ts` | Editar | Adicionar sync apos update local |

### Secao Tecnica - Edge Function

A edge function faz:
1. Valida auth e membership
2. Busca `invoicexpress_api_key` e `invoicexpress_account_name` da organizacao
3. Constroi o body com mapeamento de campos Senvia -> InvoiceXpress
4. `PUT https://{account}.app.invoicexpress.com/items/{id}.json?api_key={key}`
5. Retorna o item atualizado ou erro

Se o InvoiceXpress retornar 404 (item ja nao existe la), a function retorna aviso mas nao falha criticamente.

