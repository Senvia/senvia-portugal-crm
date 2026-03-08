

## Fix: Modais com tamanho excessivo

### Problema
No `dialog.tsx`, a variante `default` aplica `top` e `bottom` via inline style, o que estica o modal verticalmente para ocupar toda a viewport. Resultado: modais pequenos (ex: criar lista, criar conta) ficam enormes com espaço vazio.

### Solução — `src/components/ui/dialog.tsx`

Alterar o posicionamento da variante `default`:
- Remover o inline `style` que define `top` e `bottom` simultaneamente
- Usar `top-[50%] -translate-y-[50%]` para centrar verticalmente
- Adicionar `max-h-[calc(100vh-2rem)]` para limitar altura e permitir scroll
- Manter `h-auto` para que o modal se ajuste ao conteúdo

**Classe default atualizada:**
```
fixed left-1/2 top-[50%] -translate-x-1/2 -translate-y-[50%] z-50 grid w-full max-w-lg max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto gap-4 border bg-background p-6 shadow-lg ...
```

Remove-se o bloco `style={variant === "default" ? { top: ..., bottom: ... } : undefined}`.

### Resultado
Modais centrados vertical e horizontalmente, com tamanho ajustado ao conteúdo, e scroll automático se o conteúdo exceder a viewport.

