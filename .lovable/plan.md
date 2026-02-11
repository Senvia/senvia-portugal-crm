

## Passar Todos os Dados da Proposta para a Venda

### Problema

Quando uma proposta e aceite, os campos `negotiation_type` (tipo de negociacao) e `servicos_produtos` (lista de servicos selecionados) nao sao transferidos para a venda. Os restantes campos (proposal_type, consumo_anual, margem, dbl, anos_contrato, modelo_servico, kwp, comissao) ja passam corretamente.

### O que falta

| Campo | Proposta | Venda (tabela) | Venda (codigo) |
|-------|----------|-----------------|-----------------|
| negotiation_type | Sim | Nao existe | Nao existe |
| servicos_produtos | Sim | Nao existe | Nao existe |

### Alteracoes

**1. Migracao de base de dados**

Adicionar duas novas colunas a tabela `sales`:
- `negotiation_type` (text, nullable) - para guardar o tipo de negociacao (angariacao, renovacao, etc.)
- `servicos_produtos` (text[], nullable) - para guardar a lista de servicos fixos (Solar, Carregadores, etc.)

**2. Ficheiro: `src/types/sales.ts`**

Adicionar os campos `negotiation_type` e `servicos_produtos` a interface `Sale` e importar/reutilizar o tipo `NegotiationType` de proposals.

**3. Ficheiro: `src/hooks/useSales.ts`**

Atualizar a funcao `useCreateSale` para aceitar e enviar os novos campos ao insert.

**4. Ficheiro: `src/components/sales/CreateSaleModal.tsx`**

- Adicionar estados para `negotiationToype` e `servicosProdutos`
- No reset/prefill (useEffect), copiar estes valores da proposta
- No `handleProposalSelect`, copiar estes valores
- No `handleSubmit`, enviar os novos campos ao `createSale.mutateAsync`

**5. Ficheiro: `src/components/sales/SaleDetailsModal.tsx`** (se existir visualizacao destes campos)

Exibir os novos campos na secao de dados telecom do modal de detalhes da venda, para consistencia com o que ja e mostrado nas propostas.

### Secao Tecnica

**SQL da migracao:**
```sql
ALTER TABLE public.sales
  ADD COLUMN negotiation_type text,
  ADD COLUMN servicos_produtos text[];
```

**Prefill no CreateSaleModal (useEffect existente):**
```typescript
setNegotiationType(prefillProposal.negotiation_type || null);
setServicosProdutos(prefillProposal.servicos_produtos || []);
```

**Submit (createSale.mutateAsync):**
```typescript
negotiation_type: negotiationType || undefined,
servicos_produtos: servicosProdutos.length > 0 ? servicosProdutos : undefined,
```
