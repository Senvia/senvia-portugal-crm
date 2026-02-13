

# Mover dados da proposta para um card acima do Cliente

## Objectivo
Criar um card de contexto/resumo da proposta (codigo, estado, tipo de negociacao, data) logo acima do card "Cliente" na coluna esquerda, semelhante a barra de contexto usada nos modais de venda.

## O que muda

### `src/components/proposals/ProposalDetailsModal.tsx`

1. **Header simplificado**: Manter apenas o titulo "Proposta {code}" e o botao de fechar. Remover as badges de status e tipo de negociacao e a data do header.

2. **Novo card "Dados da Proposta"** no topo da coluna esquerda (antes do card Cliente):
   - Codigo da proposta
   - Data da proposta
   - Badge de status (com o seletor de estado integrado - mover o card "Status" actual para aqui)
   - Badge de tipo de negociacao (telecom)
   - Badge de tipo de proposta Energia/Servicos (telecom)

3. **Remover o card "Status" separado** (linhas 421-446) - o seletor de estado passa a estar dentro do novo card de contexto.

4. **Remover o card "Tipo Badge"** separado (linhas 448-465) - o tipo passa a estar no card de contexto.

## Estrutura do novo card

```text
Card "Dados da Proposta"
  +-- Linha 1: Codigo (ex: "Proposta 0015") | Data
  +-- Linha 2: Seletor de Status | Badge Angariacao | Badge Energia/Servicos
```

## Ficheiro alterado
- `src/components/proposals/ProposalDetailsModal.tsx`
