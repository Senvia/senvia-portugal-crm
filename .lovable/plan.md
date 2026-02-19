

# Tornar Propostas Recentes clicaveis no Cliente

## Resumo
Ao clicar numa proposta recente na ficha do cliente (ClientDetailsDrawer), abrir o modal de detalhes dessa proposta (ProposalDetailsModal).

## O que muda

No ficheiro `src/components/clients/ClientDetailsDrawer.tsx`:

1. Adicionar um estado `selectedProposal` para controlar qual proposta esta selecionada
2. Importar `ProposalDetailsModal` e o tipo `Proposal`
3. Tornar cada item da lista "Propostas Recentes" clicavel (com cursor pointer e hover effect)
4. Ao clicar, guardar a proposta no estado e abrir o modal de detalhes
5. Renderizar o `ProposalDetailsModal` com a proposta selecionada

## Detalhe tecnico

- Os dados de `proposals` vindos do `useClientHistory` ja contem todos os campos necessarios (sao um `select('*')` da tabela proposals)
- Basta fazer cast para `Proposal` e passar ao `ProposalDetailsModal`
- Adicionar um `ChevronRight` icon para indicar que e clicavel
- O mesmo padrao pode ser aplicado as "Vendas Recentes" no futuro

## Ficheiros alterados
- `src/components/clients/ClientDetailsDrawer.tsx`
