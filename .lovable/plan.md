
# Mover Nome do Lead e Data de Criacao para "Informacoes de Contacto"

## Problema
O nome editavel do lead e a data de criacao estao no header fixo do modal (topo da pagina). Deviam estar dentro do card "Informacoes de Contacto" na coluna lateral direita.

## Alteracoes em `src/components/leads/LeadDetailsModal.tsx`

### 1. Simplificar o Header (linhas 241-272)
- Remover o `<DialogHeader>` com o `<Input>` do nome e a `<DialogDescription>` com a data
- Manter apenas o botao "Voltar" e um titulo generico (ex: "Detalhes do Lead") ou apenas o botao Voltar
- O `<DialogTitle>` precisa existir por acessibilidade, entao colocar um titulo simples como "Detalhes do Lead"

### 2. Adicionar Nome editavel ao card "Informacoes de Contacto" (linha ~519)
- Dentro do `<CardContent>` do card "Informacoes de Contacto", adicionar como primeiro campo:
  - Icone `UserCircle` + Input editavel do nome (o mesmo que esta no header atualmente)
- A data de criacao ja existe neste card (linha 568-569), entao nao precisa ser duplicada -- apenas remover do header

### Resultado
- Header fica limpo: so botao "Voltar" + titulo de acessibilidade
- Card "Informacoes de Contacto" passa a ter: Nome (editavel), NIF, Telefone, Email, Data de criacao
