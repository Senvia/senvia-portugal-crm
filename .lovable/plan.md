

# Uniformizar Layout dos Modais de Venda

## Problema
Os modais "Criar Venda" e "Editar Venda" tem os botoes de acao dentro da coluna direita (inline no scroll), enquanto o "Detalhes da Venda" tem um footer fixo no fundo. Isto cria uma experiencia inconsistente.

## O que fazer

### 1. `src/components/sales/CreateSaleModal.tsx`

**Mover o botao "Criar Venda" para um footer fixo no fundo do modal**, igual ao SaleDetailsModal:

- Remover o botao `<Button>Criar Venda</Button>` da coluna direita (linhas 1148-1162)
- Adicionar um `<div>` de footer fixo apos o `</div>` do conteudo scrollavel, com a mesma estrutura do SaleDetailsModal:
  - Botao "Criar Venda" com `variant="senvia"` (acao principal)
  - Botao "Cancelar" com `variant="outline"`

Layout do footer:
```text
[ Criar Venda (senvia) ] [ Cancelar (outline) ]
```

### 2. `src/components/sales/EditSaleModal.tsx`

**Mover os botoes "Guardar Alteracoes" e "Cancelar" para um footer fixo no fundo**:

- Remover os botoes da coluna direita (linhas 658-684)
- Adicionar um `<div>` de footer fixo igual ao SaleDetailsModal:
  - Botao "Guardar Alteracoes" com `variant="senvia"` (acao principal)
  - Botao "Cancelar" com `variant="outline"`

Layout do footer:
```text
[ Guardar Alteracoes (senvia) ] [ Cancelar (outline) ]
```

### Estrutura do footer (igual nos dois modais)

```text
<div className="p-4 border-t border-border/50 shrink-0">
  <div className="flex gap-3 max-w-6xl mx-auto">
    ... botoes ...
  </div>
</div>
```

Isto garante que os 3 modais de venda (Criar, Editar, Detalhes) tenham o mesmo padrao visual: conteudo scrollavel + footer fixo com acoes.

