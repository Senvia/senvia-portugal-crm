

# Redesign dos Modais de Vendas para Layout Full-Page

## Problema

Os tres modais de vendas (Nova Venda, Editar Venda, Visualizar Venda) usam dialogos centrados com largura maxima limitada (`max-w-lg` / `max-w-2xl`) e altura maxima de `90vh`. Em ecras maiores, o espaco disponivel e desperdicado e o conteudo fica apertado com scroll excessivo.

## Solucao

Converter os tres modais de `Dialog` centrado para um layout **full-screen overlay** que ocupa toda a viewport, adaptando-se ao ecra:

- **Mobile**: Ocupa 100% da largura e altura (como uma pagina nativa)
- **Desktop**: Ocupa toda a viewport com padding lateral minimo, e o conteudo interno fica centrado com largura maxima confortavel (`max-w-4xl`)

A abordagem mantem o componente `Dialog` do Radix (para manter compatibilidade com modais aninhados como `PaymentTypeSelector` e `AlertDialog`), mas altera as classes CSS do `DialogContent` para ocupar a tela toda.

## Alteracoes por ficheiro

### 1. `src/components/sales/CreateSaleModal.tsx`

- Alterar `DialogContent` de `max-w-2xl max-h-[90vh]` para classes full-screen: `w-screen h-screen max-w-none max-h-none rounded-none sm:rounded-none inset-0 translate-x-0 translate-y-0 top-0 left-0`
- O conteudo interno (form) recebe `max-w-4xl mx-auto` para centralizar em ecras largos
- O `ScrollArea` passa a usar `h-[calc(100vh-header-footer)]` em vez de `max-h`
- Header e footer ficam fixos (sticky) no topo e fundo

### 2. `src/components/sales/EditSaleModal.tsx`

- Mesma transformacao: `DialogContent` passa a full-screen
- O conteudo do form recebe `max-w-4xl mx-auto`
- Layout ja usa `flex flex-col` com `flex-1` para o scroll, basta ajustar as dimensoes

### 3. `src/components/sales/SaleDetailsModal.tsx`

- Mesma transformacao: `DialogContent` passa a full-screen
- O conteudo interno recebe `max-w-4xl mx-auto`
- Em desktop, os campos podem aproveitar melhor o espaco com grids de 2-3 colunas onde fizer sentido (ex: dados do cliente lado a lado com status)

### Classe CSS reutilizavel

Para evitar duplicacao, a classe sera aplicada diretamente no `DialogContent` com uma combinacao consistente:

```text
fixed inset-0 z-50 w-full h-full max-w-none translate-x-0 translate-y-0
flex flex-col bg-background border-0 rounded-none
data-[state=open]:animate-in data-[state=closed]:animate-out
data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0
```

### Estrutura interna (comum aos 3)

```text
+--------------------------------------------------+
| Header (sticky, border-bottom)                    |
|   [Icone] Titulo        [Codigo] [Data]     [X]  |
+--------------------------------------------------+
|                                                    |
|   <div max-w-4xl mx-auto>                         |
|     Conteudo scrollavel                            |
|     (formulario ou detalhes)                       |
|   </div>                                          |
|                                                    |
+--------------------------------------------------+
| Footer (sticky, border-top)                       |
|   [Cancelar]                    [Guardar/Acao]    |
+--------------------------------------------------+
```

### Notas tecnicas

- O botao de fechar (X) do Radix `DialogClose` continua a funcionar normalmente
- Os modais aninhados (`PaymentTypeSelector` com `AlertDialog`, `AlertDialog` de confirmacao de delete) nao sao afetados pois usam componentes separados
- A animacao de entrada muda de `zoom-in` + `slide-from-center` para `fade-in` simples (mais adequado para full-screen)
- Toda a logica de negocio, state e handlers permanece inalterada -- apenas o layout CSS muda

