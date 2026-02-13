

# Mover dados do cliente para card de contexto

## Objectivo
Mover o codigo, badge de status e data de criacao do header para um card de contexto posicionado acima do card "Dados do Cliente" na coluna esquerda -- seguindo o mesmo padrao aplicado nas Propostas.

## Alteracoes em `src/components/clients/ClientDetailsDrawer.tsx`

### 1. Simplificar o Header (linhas 140-170)
- Manter apenas: Avatar + Nome do cliente + botao "Editar" + botao fechar
- Remover: codigo (#0004), badge de status (Bronze), texto "Cliente desde..."

### 2. Novo Card de Contexto (antes do card "Dados do Cliente", linha 179)
Inserir um novo card com:
- Linha 1: Codigo do cliente (ex: "#0004") + Data de criacao
- Linha 2: Badge de status/tipologia (Bronze/Prata/Ouro ou Ativo/Inativo/VIP) + Badge de origem (se existir)

### 3. Manter o card "Dados do Cliente" actual
O card existente fica por baixo do novo card de contexto, mantendo os restantes campos (contacto, empresa, etc.).

## Ficheiro alterado
- `src/components/clients/ClientDetailsDrawer.tsx`

