

# Filtrar Propostas Aceites no Modal de Criar Venda

## Resumo
No modal de criacao de venda, a lista de propostas mostra todas exceto as rejeitadas. O correto e mostrar **apenas as propostas com estado "accepted"** (Aceite).

## O que muda

No ficheiro `src/components/sales/CreateSaleModal.tsx`, na linha 316, alterar o filtro de propostas:

- **Antes:** `proposals.filter(p => p.status !== 'rejected')` (mostra todas menos rejeitadas)
- **Depois:** `proposals.filter(p => p.status === 'accepted')` (mostra apenas aceites)

## Logica

Faz sentido porque uma venda so deve ser criada a partir de uma proposta que ja foi aceite pelo cliente. Propostas em rascunho, enviadas ou pendentes nao devem aparecer como opcao.

A excecao mantida: se houver uma `prefillProposal` (quando a venda e criada automaticamente ao aceitar uma proposta), essa proposta continua a aparecer na lista independentemente do filtro.

## Ficheiros alterados
- `src/components/sales/CreateSaleModal.tsx` (1 linha)

