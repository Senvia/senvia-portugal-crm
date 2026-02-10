

## Corrigir taxa de IVA na emissao de faturas (suporte para isentos)

### Problema critico

O codigo atual **hardcoda IVA a 23%** em todas as faturas. Para organizacoes isentas de IVA, isto gera documentos fiscais incorretos que obrigam a nota de credito.

### Solucao

Adicionar configuracao fiscal na organizacao e usa-la na emissao de faturas.

### Alteracoes

**1. Migracao SQL -- nova coluna na tabela `organizations`**

Adicionar campo `tax_config` (JSONB) com:
- `tax_name`: nome do imposto no InvoiceXpress (ex: `"IVA23"`, `"Isento"`)
- `tax_value`: valor percentual (ex: `23`, `0`)
- `tax_exemption_reason`: motivo de isencao AT (ex: `"M07 - Artigo 9.º do CIVA"`) -- obrigatorio quando valor = 0

Valor por defeito: `{"tax_name": "IVA23", "tax_value": 23, "tax_exemption_reason": null}`

**2. `src/components/settings/IntegrationsContent.tsx`**

Na seccao InvoiceXpress (ja existente), adicionar campos:
- Select com opcoes: "IVA 23%", "IVA 6%", "IVA 13%", "Isento de IVA"
- Quando "Isento" selecionado, mostrar campo para motivo de isencao (select com opcoes da AT: M01 a M16)
- Gravar em `organizations.tax_config`

**3. `supabase/functions/issue-invoice/index.ts`**

- Ler `tax_config` da organizacao (ja faz query a tabela organizations)
- Usar `tax_name` e `tax_value` do config em vez do hardcoded `IVA23`
- Se `tax_value` = 0 e existe `tax_exemption_reason`, adicionar ao item:
  ```
  tax: { name: "Isento", value: 0 },
  tax_exemption_reason: "M07 - Artigo 9.º do CIVA"
  ```
- Se nao ha config, manter fallback IVA 23%

**4. Validacao antes de emitir**

- Na edge function, se `tax_value` = 0 e `tax_exemption_reason` esta vazio, retornar erro:
  "Configure o motivo de isencao de IVA nas definicoes antes de emitir faturas."

### Motivos de isencao AT (para o select)

| Codigo | Descricao |
|---|---|
| M01 | Artigo 16.o n.o 6 do CIVA |
| M02 | Artigo 6.o do Decreto-Lei n.o 198/90 |
| M04 | Isento Artigo 13.o do CIVA |
| M05 | Isento Artigo 14.o do CIVA |
| M06 | Isento Artigo 15.o do CIVA |
| M07 | Isento Artigo 9.o do CIVA |
| M09 | IVA - nao confere direito a deducao |
| M10 | IVA - regime de isencao (Art. 53.o) |
| M11 | Regime particular do tabaco |
| M12 | Regime da margem de lucro |
| M13 | Regime de IVA de Caixa |
| M16 | Isento Artigo 14.o do RITI |

### Resumo de ficheiros

| Ficheiro | Alteracao |
|---|---|
| Migracao SQL | Adicionar coluna `tax_config` JSONB em `organizations` |
| `IntegrationsContent.tsx` | Campos de configuracao fiscal na seccao InvoiceXpress |
| `issue-invoice/index.ts` | Ler config fiscal e usar na emissao em vez de IVA23 hardcoded |

