

# Corrigir Botoes do Footer - Ordem e Cores

## Problemas
1. O botao "Voltar" esta no inicio, mas deve ficar no final (depois de "Emitir Fatura")
2. Todos os botoes tem cores muito similares ao fundo, nao se distinguem visualmente

## O que fazer

### `src/components/sales/SaleDetailsModal.tsx` (Footer, linhas 660-710)

1. **Mover "Voltar" para o fim** da linha de botoes (depois do botao "Emitir Fatura")
2. **Aplicar cores distintas a cada botao**:
   - **Editar Venda** - `variant="outline"` (bordas visiveis, mantemos)
   - **Ver Rascunho Fatura** - `variant="secondary"` (fundo cinza visivel)
   - **Emitir Fatura / Fatura-Recibo** - `variant="senvia"` (gradiente azul, botao principal)
   - **Voltar** - `variant="outline"` com estilo subtil mas visivel

Ordem final:

```text
[ Editar Venda (outline) ] [ Ver Rascunho (secondary) ] [ Emitir Fatura (senvia/primary) ] [ Voltar (outline) ]
```

Assim cada botao tem uma cor diferente e destaca-se claramente do fundo.
