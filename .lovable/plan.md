
Objetivo

Fazer com que a venda 0018 mostre claramente os 80.000 kWh nos detalhes da venda, mesmo quando o campo agregado da venda está vazio.

O que confirmei
- A venda `0018` está com:
  - `sales.consumo_anual = null`
  - `sales.margem = null`
  - `sales.dbl = null`
  - `sales.anos_contrato = null`
- Mas a proposta ligada à venda tem 1 CPE com:
  - `consumo_anual = 80000`
  - `margem = 1680.96`
  - `dbl = 12`
  - `comissao = 50.56`
  - `contrato_inicio = 2026-03-12`
  - `contrato_fim = 2027-12-11`

Causa do problema
- Em `src/components/sales/SaleDetailsModal.tsx`, o cartão “Dados de Energia” só mostra campos vindos de `sale.*`.
- A mesma modal já carrega `proposalCpes`, mas a secção de CPEs mostra só identificador/comercializador/fidelização e não mostra consumo, DBL, margem, comissão ou contrato.
- Resultado: o valor existe, mas não aparece em lado nenhum no detalhe da venda.

Plano de implementação

1. Corrigir o cartão “Dados de Energia”
- Em `SaleDetailsModal.tsx`, calcular valores derivados a partir de `proposalCpes` quando `sale.*` vier vazio.
- Prioridade:
  - usar `sale.consumo_anual` se existir
  - senão usar a soma de `proposalCpes[].consumo_anual`
- Fazer o mesmo para os restantes campos energéticos quando possível:
  - `dbl`
  - `margem`
  - `comissao`
  - duração/contrato
- Atualizar `hasEnergyData` para considerar também `proposalCpes.length > 0`.

2. Enriquecer a secção de CPEs na modal de detalhes
- Reutilizar o padrão já existente em:
  - `src/components/sales/CreateSaleModal.tsx`
  - `src/components/proposals/ProposalDetailsModal.tsx`
- Em cada CPE mostrar:
  - Consumo Anual
  - Duração
  - DBL
  - Margem
  - Comissão
  - Contrato (início/fim)

3. Manter consistência visual
- Preservar o layout atual da modal.
- Mostrar os campos extra só quando existirem.
- Continuar a usar formatação PT:
  - kWh com `toLocaleString('pt-PT')`
  - moeda com `formatCurrency`
  - datas em `dd/MM/yyyy`

Resultado esperado
- A venda `0018` passa a mostrar os `80.000 kWh` nos detalhes.
- O utilizador consegue ver o valor tanto no resumo energético como no detalhe do CPE.
- Outras vendas com o mesmo padrão deixam de parecer “sem energia” quando os dados estão só nos CPEs.

Ficheiro a alterar
- `src/components/sales/SaleDetailsModal.tsx`

Detalhes técnicos
```text
displayConsumoAnual =
  sale.consumo_anual ?? sum(proposalCpes.consumo_anual)

hasEnergyData =
  campos_energia_da_sale || proposalCpes.length > 0
```

Validação após implementação
- Abrir a venda `0018`
- Confirmar que aparecem `80.000 kWh`
- Confirmar que o detalhe do CPE mostra também DBL, margem, comissão e datas de contrato
- Validar outra venda sem CPEs para garantir que nada regressou
