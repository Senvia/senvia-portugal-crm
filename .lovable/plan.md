

# Mostrar Todos os Dados ao Editar uma Venda

## Problema

O modal de edicao de vendas (`EditSaleModal`) esta incompleto em comparacao com o modal de detalhes (`SaleDetailsModal`). Quando o utilizador abre a edicao, faltam os seguintes dados:

- **Dados de Energia**: Tipo de Negociacao, Consumo Anual, Margem, DBL, Anos de Contrato, Comissao
- **Dados de Servicos**: Modelo de Servico, kWp, Produtos/Servicos selecionados, Comissao
- **CPEs da Proposta**: Equipamentos/Pontos de consumo associados
- **Dados de Recorrencia**: Valor recorrente, estado, proxima renovacao
- **Data da Venda**: Nao e editavel atualmente

## Solucao

Adicionar as seccoes em falta ao `EditSaleModal`, consistentes com o que e mostrado no `SaleDetailsModal`.

## Seccao Tecnica

### Ficheiro: `src/components/sales/EditSaleModal.tsx`

**1. Importar dependencias em falta:**
- `useProposalCpes` hook
- `useCpes` hook
- `NEGOTIATION_TYPE_LABELS`, `MODELO_SERVICO_LABELS`, `SERVICOS_PRODUCTS` de `@/types/proposals`
- Icones `Zap`, `Wrench`
- `RecurringSection` component
- Tipos CPE (`CPE_STATUS_LABELS`, `CPE_STATUS_STYLES`)

**2. Adicionar hooks de dados:**
- `useProposalCpes(sale?.proposal_id)` para buscar CPEs da proposta
- `useCpes(clientId)` para buscar CPEs do cliente

**3. Adicionar seccao "Dados de Energia" (read-only):**
- Aparece quando `proposal_type === 'energia'` e existe dados relevantes
- Mostra: Tipo de Negociacao, Consumo Anual, Margem, Anos Contrato, DBL, Comissao
- Apresentado como Card read-only (igual ao SaleDetailsModal)

**4. Adicionar seccao "Dados de Servicos" (read-only):**
- Aparece quando `proposal_type === 'servicos'`
- Mostra: Modelo de Servico, kWp, Produtos/Servicos selecionados, Comissao

**5. Adicionar seccao "CPEs da Proposta" (read-only):**
- Aparece quando existem CPEs na proposta associada
- Mostra: Comercializador, Consumo, Margem, Comissao por CPE

**6. Adicionar seccao "Recorrencia":**
- Aparece quando `sale.has_recurring` e verdadeiro
- Mostra o `RecurringSection` component (ja existente)

**7. Posicionamento:**
- As novas seccoes ficam entre o card de "Proposta associada" e o card de "Produtos/Servicos"
- Ordem: Dados da Venda > Cliente > Proposta > Dados Energia/Servicos > CPEs > Produtos > Recorrencia > Pagamentos

Total: 1 ficheiro editado.

