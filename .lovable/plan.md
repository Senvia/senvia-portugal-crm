

## Remover campo "Margem" do resumo da Venda (Telecom)

### Alteração

**`src/components/sales/SaleDetailsModal.tsx`**:

1. **Remover o bloco "Margem"** (linhas 434-439) do card "Dados de Energia" — o campo que mostra `sale.margem` com label "Margem" e valor em €/MWh
2. O "Valor Total" do resumo principal (linhas 252-256 e 676-680) mantém-se — esse mostra `sale.total_value` que é o valor da venda, não a margem per se

Resultado: No card de energia da venda, deixa de aparecer "Margem: X.XX €/MWh". Os restantes campos (Consumo Anual, Contrato, DBL, Comissão) mantêm-se.

