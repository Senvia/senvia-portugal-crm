

# Criar produto automaticamente no KeyInvoice quando nao existe

## Problema

O erro `IdProduct invalido` ocorre porque a conta KeyInvoice nao tem produtos cadastrados. O codigo atual bloqueia com erro 400 pedindo ao utilizador para criar manualmente. Agora que temos a documentacao do `insertProduct`, podemos criar automaticamente.

## Solucao

No ficheiro `supabase/functions/issue-invoice/index.ts`, substituir o bloco de erro quando `keyInvoiceProducts.length === 0` (linhas 220-226) por logica que cria o produto automaticamente via `insertProduct`.

## Detalhes tecnicos

**Ficheiro:** `supabase/functions/issue-invoice/index.ts`

### Alteracao 1: Criar produto automaticamente (linhas 219-226)

Substituir o return de erro por uma funcao que cria o produto no KeyInvoice usando os campos da documentacao:

```typescript
// Se nao existem produtos, criar automaticamente para cada item da venda
if (keyInvoiceProducts.length === 0) {
  console.log('KeyInvoice: 0 products, creating automatically via insertProduct')
  for (const item of items) {
    const itemName = item.name || 'Servico'
    const itemCode = itemName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) || 'SRV001'
    
    const insertProductPayload: Record<string, any> = {
      method: 'insertProduct',
      IdProduct: itemCode,
      Name: itemName,
      TaxValue: String(orgTaxValue),
      IsService: '1',
      HasStocks: '0',
      Active: '1',
      Price: String(Number(item.unit_price)),
    }

    // Se IVA = 0, adicionar codigo de isencao
    if (orgTaxValue === 0) {
      insertProductPayload.TaxExemptionReasonCode = 'M10'
    }

    const prodRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Sid': sid },
      body: JSON.stringify(insertProductPayload),
    })
    const prodData = await prodRes.json()
    console.log('KeyInvoice insertProduct response:', JSON.stringify(prodData))

    if (prodData.Status === 1 && prodData.Data?.Id) {
      keyInvoiceProducts.push({
        Id: prodData.Data.Id,
        Name: itemName,
        Description: itemName,
      })
    } else {
      console.error('KeyInvoice insertProduct failed:', prodData.ErrorMessage)
      return new Response(JSON.stringify({
        error: `Erro ao criar produto "${itemName}" no KeyInvoice: ${prodData.ErrorMessage || 'Erro desconhecido'}`,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }
}
```

### Alteracao 2: Melhorar findProductId (linhas 228-242)

Manter a funcao `findProductId` como esta - ela ja faz match por nome e fallback para o primeiro produto. Agora com os produtos criados automaticamente, o match por nome vai funcionar diretamente.

### Resultado esperado

1. `listProducts` retorna 0 produtos
2. Para cada item da venda, chama `insertProduct` com `IdProduct` (codigo), `Name`, `TaxValue`, `IsService:1`, `HasStocks:0`, `Price`
3. Se `insertProduct` retorna `Status:1` com `Data.Id`, adiciona ao array local
4. O `findProductId` faz match pelo nome e usa o Id retornado
5. O `insertDocument` recebe os IdProduct validos e a fatura e emitida

