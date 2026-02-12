

# Corrigir Visibilidade dos Botoes em Toda a App

## Problema
Os variantes `outline`, `secondary` e `ghost` do componente Button usam cores praticamente iguais ao fundo da pagina, tornando os botoes invisiveis.

## Solucao

### `src/components/ui/button.tsx`

Atualizar os estilos dos 3 variantes problematicos:

- **outline**: Adicionar borda mais forte e fundo subtil para se destacar do background
  - De: `border border-input bg-background hover:bg-accent`
  - Para: `border-2 border-border bg-background hover:bg-accent hover:text-accent-foreground shadow-sm`

- **secondary**: Usar um fundo mais escuro/contrastante
  - De: `bg-secondary text-secondary-foreground hover:bg-secondary/80`
  - Para: `bg-muted text-foreground border border-border hover:bg-accent shadow-sm`

- **ghost**: Adicionar borda subtil para que o botao seja pelo menos reconhecivel como botao
  - De: `hover:bg-accent hover:text-accent-foreground`
  - Para: `text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-border`

Estas alteracoes sao globais - afetam todos os botoes da aplicacao de uma vez, corrigindo o problema em todas as paginas (Vendas, Leads, Clientes, Financas, etc.).

