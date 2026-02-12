

# Corrigir a leitura de produtos do KeyInvoice + fallback robusto

## Problema raiz

Os logs mostram:
- `listProducts status: 1` (sucesso!)
- `products found: 0`

Isto significa que a API retorna produtos, MAS o codigo esta a ler no campo errado. A linha 174 verifica `listData.Data?.Products` - contudo a resposta real da API provavelmente tem uma estrutura diferente (pode ser `listData.Data` diretamente, ou outro campo).

## Solucao (2 passos)

### Passo 1: Adicionar log completo da resposta e corrigir parsing

No ficheiro `supabase/functions/issue-invoice/index.ts`, na funcao `handleKeyInvoice`, alterar a secao de `listProducts` (linhas 164-181) para:

1. Logar a resposta completa (`JSON.stringify(listData)`) para ver a estrutura real
2. Tentar multiplos caminhos de dados:
   - `listData.Data.Products` (atual)
   - `listData.Data` diretamente (se for array)
   - `listData.Data.Product` (singular)
   - Chaves do objeto `listData.Data` (se nenhuma das acima funcionar)

### Passo 2: Fallback - criar produto automaticamente se necessario

Se apos a correcao do parsing nao existirem produtos, tentar criar um produto generico "Servico" via `insertProduct`. Se a criacao tambem falhar, usar `Description` diretamente no DocLines como ultima tentativa (conforme a documentacao indica que e possivel).

## Detalhes tecnicos

**Ficheiro:** `supabase/functions/issue-invoice/index.ts`

**Alteracoes na secao listProducts (linhas 164-189):**

```typescript
// Log full response to debug structure
const listData = await listRes.json()
console.log('KeyInvoice listProducts FULL response:', JSON.stringify(listData).substring(0, 2000))

if (listData.Status === 1 && listData.Data) {
  // Try multiple paths to find the products array
  if (Array.isArray(listData.Data)) {
    keyInvoiceProducts = listData.Data
  } else if (Array.isArray(listData.Data.Products)) {
    keyInvoiceProducts = listData.Data.Products
  } else if (Array.isArray(listData.Data.Product)) {
    keyInvoiceProducts = listData.Data.Product
  } else if (typeof listData.Data === 'object') {
    // Maybe Data is a single product or has nested keys
    const keys = Object.keys(listData.Data)
    console.log('KeyInvoice listProducts Data keys:', keys.join(', '))
    // Check if any key contains an array
    for (const key of keys) {
      if (Array.isArray(listData.Data[key])) {
        keyInvoiceProducts = listData.Data[key]
        console.log('Found products array under key:', key)
        break
      }
    }
    // If Data itself looks like a product (has Id), wrap it
    if (keyInvoiceProducts.length === 0 && listData.Data.Id) {
      keyInvoiceProducts = [listData.Data]
    }
  }
}
```

**Remover o bloqueio dos 0 produtos (linhas 183-189) e substituir por fallback:**

Se 0 produtos encontrados apos todas as tentativas de parsing, em vez de retornar erro 400, construir DocLines apenas com `Description`, `Qty` e `Price` (sem `IdProduct`) como fallback final. Se a API ainda rejeitar, AI mostra o erro real.

```typescript
if (keyInvoiceProducts.length === 0) {
  console.log('KeyInvoice: 0 products found, using Description-only DocLines as fallback')
  // Build DocLines without IdProduct, using Description only
  for (const item of items) {
    docLines.push({
      Description: item.name || 'Servico',
      Qty: String(Number(item.quantity)),
      Price: String(Number(item.unit_price)),
    })
  }
} else {
  // Normal flow with IdProduct matching
  for (const item of items) {
    const productId = findProductId(item.name || 'Servico')
    docLines.push({
      IdProduct: productId,
      Qty: String(Number(item.quantity)),
      Price: String(Number(item.unit_price)),
    })
  }
}
```

**Resumo:** O deploy da edge function ira primeiro mostrar nos logs a estrutura real da resposta do `listProducts`, permitindo corrigir o parsing definitivamente. O fallback com `Description` garante que a fatura e emitida mesmo sem produtos cadastrados.

