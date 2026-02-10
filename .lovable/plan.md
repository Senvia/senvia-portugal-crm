

## Remover secao "Dados Energia/Servicos" do modal Nova Venda

### Problema

O modal "Nova Venda" mostra uma secao editavel "Dados Energia" / "Dados Servicos" com campos como Consumo Anual, Margem, DBL, Anos Contrato, kWp, Modelo Servico e Comissao. Estes dados ja vem da proposta e nao devem ser re-editados aqui.

### Solucao

Remover a secao visual (UI) mas manter a logica que copia os dados da proposta para a venda (linhas 489-497 no handleSubmit), para que os dados continuem a ser persistidos na tabela `sales`.

### Alteracoes

**Ficheiro: `src/components/sales/CreateSaleModal.tsx`**

1. **Remover o bloco JSX** "Section 2.6: Dados Energia/Servicos" (linhas 824-924) -- toda a secao condicional `{proposalType && (...)}` com os inputs editaveis

2. **Manter os states** (`proposalType`, `consumoAnual`, `margem`, etc.) e a logica no `handleSubmit` que os envia para a base de dados -- os valores continuam a ser preenchidos automaticamente a partir da proposta selecionada

3. **Remover imports nao utilizados**: `PROPOSAL_TYPE_LABELS` e `MODELO_SERVICO_LABELS` (linhas 67-75) ja nao sao referenciados no JSX apos a remocao

| Ficheiro | Alteracao |
|---|---|
| `src/components/sales/CreateSaleModal.tsx` | Remover secao UI "Dados Energia/Servicos" (manter persistencia dos dados) |

