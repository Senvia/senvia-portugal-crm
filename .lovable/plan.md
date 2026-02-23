

# Corrigir: Fatura da Ângela Não Aparece em Faturas

## Diagnóstico

A Ângela Oliveira tem uma venda (código 0003, valor 275EUR) com 3 pagamentos que referenciam faturas-recibo do InvoiceXpress (ex: "FR ATSIRE01FR/3"). No entanto, **nenhuma dessas faturas-recibo existe na tabela `invoices`** (que só tem 5 registos, todos de outros clientes).

### Causa raiz

O sincronizador (`sync-invoices`) busca documentos do InvoiceXpress via API e tenta associar às vendas/pagamentos locais. Há dois problemas:

1. **Sem `invoicexpress_id`**: A venda e os pagamentos da Ângela não têm `invoicexpress_id` preenchido, então o matching por ID falha.
2. **Matching por referência falha**: Os pagamentos guardam "FR ATSIRE01FR/3" como `invoice_reference`, mas o sync compara usando `ilike` com o `sequence_number` do documento InvoiceXpress, que pode ter formato diferente (ex: "3/2026" vs "FR ATSIRE01FR/3").

## Solução

Melhorar o matching no `sync-invoices` para também comparar o `client_name` do InvoiceXpress com os clientes locais, e melhorar o matching de referências.

### Alterações em `supabase/functions/sync-invoices/index.ts`

1. **Adicionar Match 6 -- por client_name**: Quando nenhum match anterior funciona, procurar vendas cujo `client_id` corresponda a um cliente com o mesmo nome que o `client_name` do documento InvoiceXpress (usando `immutable_unaccent` para ignorar acentos).

2. **Melhorar Match por referência**: Normalizar as referências removendo prefixos como "FR ", "FT " antes de comparar. Exemplo: "FR ATSIRE01FR/3" deve ser comparado apenas com "ATSIRE01FR/3" ou o número sequencial "3".

### Detalhe técnico

No ficheiro `supabase/functions/sync-invoices/index.ts`, após o Match 5, adicionar:

```typescript
// Match 6: by client_name -> crm_clients -> sales
if (!matchedSaleId && !matchedPaymentId && docClientName) {
  const { data: clients } = await supabase
    .from('crm_clients')
    .select('id')
    .eq('organization_id', organization_id)
    .ilike('name', `%${docClientName}%`)
    .limit(1)
  
  if (clients && clients.length > 0) {
    const { data: sales } = await supabase
      .from('sales')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('client_id', clients[0].id)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (sales && sales.length > 0) {
      matchedSaleId = sales[0].id
    }
  }
}
```

Além disso, melhorar o Match 3 para normalizar referências:

```typescript
// Antes de comparar, remover prefixos "FR ", "FT ", "FS " da referência
const cleanRef = docRef.replace(/^(FR|FT|FS)\s+/i, '')
const seqPart = cleanRef.split('/').pop() || cleanRef
```

### Ação imediata

Depois de corrigir o sync, será necessário re-executar a sincronização para importar as faturas-recibo da Ângela. Isto pode ser feito pelo botão de sync na interface de Faturas.

### Ficheiros a alterar
- `supabase/functions/sync-invoices/index.ts` (melhorar matching)

