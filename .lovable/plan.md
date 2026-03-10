

## Problema

No `CreateSaleModal`, orgs telecom sem energias ativadas não conseguem adicionar produtos porque:
1. A secção "Produtos/Serviços" genérica está escondida com `!isTelecom` (linha 1100)
2. A secção "Dados Energia" só aparece com `showEnergy && proposalId` (linha 935)
3. Não existe nenhuma secção `ServicosSection` (catálogo) para vendas diretas telecom

O mesmo problema pode existir no `EditSaleModal` e `SaleDetailsModal`.

## Solução

Adicionar a `ServicosSection` (com produtos do catálogo) ao `CreateSaleModal` para orgs telecom, independentemente de terem energias ativadas ou de terem proposta selecionada.

### Ficheiros a alterar

**1. `src/components/sales/CreateSaleModal.tsx`**
- Importar `useServicosProducts` e `ServicosSection`
- Adicionar state para `servicosProdutos`, `servicosDetails`, `modeloServico` (quando é venda direta sem proposta)
- Renderizar `ServicosSection` para telecom quando `isTelecom && !proposalId` (venda direta) ou quando `proposalType === 'servicos'`
- Sincronizar `comissao` e `total_value` com o total calculado dos produtos selecionados
- Guardar `servicos_produtos` e `servicos_details` no insert da venda

**2. `src/components/sales/EditSaleModal.tsx`**
- Mesma lógica: mostrar `ServicosSection` editável para vendas telecom de serviços

**3. `src/components/sales/SaleDetailsModal.tsx`**
- Exibir os produtos de serviços com os valores editados na venda

