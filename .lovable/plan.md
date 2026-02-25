

## Integrar Matriz de Comissões nas Vendas (CreateSaleModal + EditSaleModal)

### Problema Actual

- **Propostas** (Create/Edit) já usam `useCommissionMatrix` para calcular comissão automaticamente quando o utilizador preenche kWp, valor, etc.
- **Vendas** (Create/Edit) **não usam** a matriz de comissões. O campo `comissão` é apenas um input manual ou copiado da proposta como texto estático. Se o utilizador editar valores na venda (kWp, valor, modelo de serviço), a comissão não recalcula.

### Solução

Integrar `useCommissionMatrix` nos dois modais de venda, replicando a mesma lógica que já existe nas propostas — quando campos relevantes mudam, a comissão recalcula automaticamente.

### Alterações por ficheiro

#### 1. `src/components/sales/CreateSaleModal.tsx`

- Importar `useCommissionMatrix` e `SERVICOS_PRODUCT_CONFIGS`
- Chamar `calculateCommission` quando a venda é preenchida a partir de uma proposta com `servicos_details` — recalcular comissão usando os dados da proposta + matriz
- Para vendas criadas a partir de propostas de "Outros Serviços": ler `servicos_details` da proposta e recalcular comissão total via matriz em vez de copiar o valor estático
- Manter fallback: se a matriz não estiver configurada para um produto, usar o valor da proposta

#### 2. `src/components/sales/EditSaleModal.tsx`

- Importar `useCommissionMatrix` e `SERVICOS_PRODUCT_CONFIGS`
- Quando `proposal_type === 'servicos'`:
  - Ao alterar `kwp`, `modeloServico`, ou `servicosProdutos`, recalcular comissão via `calculateCommission`
  - Marcar campo comissão como `readOnly` quando a matriz está configurada (com indicador visual "Auto")
- Quando `proposal_type === 'energia'`:
  - Manter comissão editável por CPE (já funciona)
  - Recalcular comissão total como soma dos CPEs
- Adicionar `useEffect` que reage a mudanças em `kwp`, `modeloServico`, `servicosProdutos` e chama `calculateCommission` para cada produto activo, actualizando `comissao`

#### 3. Lógica de recálculo (comum)

Para vendas de "Outros Serviços":
```
Para cada produto em servicosProdutos:
  detail = { kwp, valor, ... } // dados da venda
  calc = calculateCommission(produto, detail, modeloServico)
  se calc !== null → usar calc
  senão → manter valor manual
comissaoTotal = soma de todas as comissões por produto
```

Para vendas de "Energia":
- Comissão vem dos CPEs (já funciona), sem alteração

### Detalhe técnico

- A lógica `calculateCommission` do hook já suporta os 4 métodos (tiered_kwp, base_plus_per_kwp, formula_percentage, percentage_valor)
- Os dados necessários (`kwp`, `valor`) já existem nos campos da venda
- Para `percentage_valor`, o `valor` será `total_value` da venda
- Para `base_plus_per_kwp` e `tiered_kwp`, o `kwp` já está disponível
- Para `formula_percentage`, o `valor` (valor do serviço) precisa estar disponível — actualmente a venda guarda `kwp` global mas não `valor` por produto; usaremos `total_value` como proxy ou os `servicos_details` se disponíveis na proposta origem

### Ficheiros a alterar

| Ficheiro | O que muda |
|---|---|
| `src/components/sales/CreateSaleModal.tsx` | Importar e usar `useCommissionMatrix`; recalcular comissão ao prefill de proposta |
| `src/components/sales/EditSaleModal.tsx` | Importar e usar `useCommissionMatrix`; recalcular comissão quando kWp/modelo/produtos mudam; marcar campo como auto quando matriz configurada |

