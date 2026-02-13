

# Adicionar titulo visivel ao header do ClientDetailsDrawer

## Problema
O header esta completamente vazio visualmente. O DialogTitle tem a classe `sr-only` (invisivel), e o botao X de fechar (gerado automaticamente pelo DialogContent) fica isolado no canto superior direito, dificil de encontrar.

## Solucao
Seguir o mesmo padrao dos modais de Propostas e Vendas: adicionar um titulo visivel no header.

## Alteracao em `src/components/clients/ClientDetailsDrawer.tsx`

### Header (linhas ~140-143)
Tornar o `DialogTitle` visivel (remover a classe `sr-only`) e adicionar um icone, seguindo o padrao dos outros modais:

```text
[User icon] Nome do Cliente                              [X]
```

- Remover `sr-only` do DialogTitle
- Adicionar icone `User` antes do nome
- Manter `DialogDescription` com `sr-only`
- O botao X de fechar ja e gerado automaticamente pelo DialogContent

### Referencia (ProposalDetailsModal)
```
<DialogTitle className="flex items-center gap-2">
  <FileText className="h-5 w-5 text-primary" />
  Proposta {proposal.code}
</DialogTitle>
```

## Ficheiro alterado
- `src/components/clients/ClientDetailsDrawer.tsx`
