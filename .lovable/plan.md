

## Corrigir emissao de faturas para regime isento (Art. 53.o - M10)

### Problema encontrado

Segundo a API do InvoiceXpress, para contas portuguesas com itens isentos de IVA (0%), e obrigatorio enviar o campo `tax_exemption` **ao nivel do documento** (raiz do payload), nao so ao nivel do item. O codigo atual so envia `exemption_reason` no item, mas falta o campo no documento.

### O que a API InvoiceXpress exige

Para faturas com IVA isento, o payload deve ter esta estrutura:

```text
{
  "invoice": {
    "date": "10/02/2026",
    "due_date": "10/02/2026",
    "tax_exemption": "M10",          <-- CAMPO QUE FALTA (nivel documento)
    "client": { ... },
    "items": [
      {
        "name": "Servico",
        "unit_price": 500,
        "quantity": 1,
        "tax": {
          "name": "Isento",
          "value": 0
        }
      }
    ]
  }
}
```

Sem o campo `tax_exemption` ao nivel do documento, a API rejeita a fatura ou gera um documento invalido.

### Alteracao unica

**`supabase/functions/issue-invoice/index.ts`**

Na construcao do `invoicePayload`, quando `taxValue === 0` e existe `tax_exemption_reason` no config, adicionar o campo `tax_exemption` ao nivel do documento:

```text
// Antes (atual):
const invoicePayload = {
  [docKey]: {
    date: formattedDate,
    due_date: formattedDate,
    client: { ... },
    items: items,
  },
}

// Depois (corrigido):
const invoicePayload = {
  [docKey]: {
    date: formattedDate,
    due_date: formattedDate,
    ...(taxValue === 0 && taxConfig.tax_exemption_reason
      ? { tax_exemption: taxConfig.tax_exemption_reason }
      : {}),
    client: { ... },
    items: items,
  },
}
```

Isto adiciona `"tax_exemption": "M10"` ao documento quando a organizacao esta configurada como isenta.

### Validacao do tax_config na tua conta

No teu caso (Art. 53.o), o `tax_config` guardado na base de dados devera ser:

```text
{
  "tax_name": "Isento",
  "tax_value": 0,
  "tax_exemption_reason": "M10"
}
```

A interface de configuracao (Definicoes -> Integracoes -> InvoiceXpress) ja suporta estas opcoes. Basta selecionar "Isento de IVA" e "M10 - IVA regime de isencao (Art. 53.o)".

### Resumo

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/issue-invoice/index.ts` | Adicionar `tax_exemption` ao nivel do documento no payload InvoiceXpress |

Uma unica linha a adicionar. Zero risco de afetar faturas com IVA normal (o campo so e adicionado quando `taxValue === 0`).

