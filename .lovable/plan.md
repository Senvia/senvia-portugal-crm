

# Remover nome e avatar do header

## Objectivo
Limpar o header do ClientDetailsDrawer, removendo o avatar e o nome do cliente. O header fica apenas com o botao "Editar" e o botao de fechar (X).

## Alteracao em `src/components/clients/ClientDetailsDrawer.tsx`

### Header (linhas ~140-157)
Remover:
- O div do avatar (circulo com inicial)
- O DialogTitle com o nome do cliente

Manter:
- DialogDescription sr-only (acessibilidade)
- Botao "Editar"
- Botao fechar (X) -- gerado automaticamente pelo DialogContent

O header ficara apenas com o botao "Editar" alinhado a direita.

## Ficheiro alterado
- `src/components/clients/ClientDetailsDrawer.tsx`

