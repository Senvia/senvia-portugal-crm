
# Mover botão "Editar" do header para a coluna direita

## Problema
O botão "Editar" está no header (topo do modal), mas nos modais de Propostas e Vendas ele fica na coluna direita, dentro do card "Ações Rápidas".

## Alteração em `src/components/clients/ClientDetailsDrawer.tsx`

### 1. Limpar o Header
- Remover o botão "Editar" do `DialogHeader`
- O header fica apenas com o botão de fechar (X) gerado automaticamente pelo DialogContent

### 2. Adicionar "Editar" ao card "Ações Rápidas"
- Inserir o botão "Editar" no card "Ações Rápidas" na coluna direita, como primeiro item (antes dos botões Ligar/WhatsApp)
- Seguir o padrão do ProposalDetailsModal: `variant="outline"`, `size="sm"`, `className="w-full justify-start"`

## Ficheiro alterado
- `src/components/clients/ClientDetailsDrawer.tsx`
