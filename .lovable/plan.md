

# Corrigir campos do insertClient para KeyInvoice

## Problema

O método `insertClient` usa nomes de campos errados (`TaxId`, `City`), causando "Parâmetro(s) inválido(s)", o que faz o cliente nunca ser criado. Depois, o `insertDocument` falha com "Cliente não existente".

## Correções em `supabase/functions/issue-invoice/index.ts`

Linha 127: `TaxId` passa a `VATIN` (campo obrigatório segundo a documentação)
Linha 132: `City` passa a `Locality`
Adicionar `CountryCode: 'PT'` como valor por defeito no payload

```text
Antes:
  Name: clientName,
  TaxId: clientNif,
  ...
  City: sale.client?.city

Depois:
  Name: clientName,
  VATIN: clientNif,
  CountryCode: 'PT',
  ...
  Locality: sale.client?.city
```

Nenhum outro ficheiro precisa de ser alterado.

