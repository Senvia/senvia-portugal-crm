

# Fix: Otto Bloqueia Toda a Interface

## Problema
O wrapper `div` do Otto tem `style={{ pointerEvents: 'auto' }}` E `inset-0` (cobre toda a tela). O inline style tem prioridade sobre a classe `pointer-events-none`, fazendo com que TODO o ecra capture cliques - so o Otto funciona porque esta dentro desse div.

## Solucao
Remover o `style={{ pointerEvents: 'auto' }}` do wrapper principal. Manter apenas nos elementos filhos (botao FAB e janela de chat) que realmente precisam de receber cliques.

## Alteracao

### Ficheiro: `src/components/otto/OttoFAB.tsx`
- Remover `style={{ pointerEvents: 'auto' }}` do div wrapper raiz do portal
- Manter `pointer-events-none` no wrapper (para nao bloquear nada)
- Os filhos ja tem `pointer-events-auto` (via classe ou inline style), entao continuam clicaveis

```text
// ANTES (quebrado):
<div style={{ pointerEvents: 'auto' }} className="fixed z-[9999] inset-0 pointer-events-none">

// DEPOIS (correcto):
<div className="fixed z-[9999] inset-0 pointer-events-none">
```

Assim o wrapper e transparente a cliques, mas o botao FAB e a janela de chat continuam interativos - mesmo com modais abertos, porque os filhos directos forcam `pointer-events: auto` via inline style.

