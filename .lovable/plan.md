

## Corrigir modais na safe area do iPhone

### Problema
O modal `default` usa `top: 50%; transform: translateY(-50%)` para centrar verticalmente. Quando o conteúdo do modal é alto, ele ultrapassa a safe area do iPhone (notch/status bar) porque o `top: 50%` é relativo ao viewport completo, não ao viewport seguro.

A propriedade `max-h` com `var(--safe-area-top/bottom)` limita a altura, mas o **posicionamento** continua a usar o viewport completo como referência.

### Solução

Alterar a estratégia de posicionamento do modal `default` para garantir que ele nunca invada a safe area:

**`src/components/ui/dialog.tsx`** — variante `default`:
- Trocar de `top-[50%] translate-y-[-50%]` para um layout que respeite as safe areas
- Usar `top: var(--safe-area-top)` + `bottom: var(--safe-area-bottom)` com `margin: auto` para centrar dentro da zona segura, ou
- Usar `inset-0` com `m-auto` + `max-h` com safe areas para centrar o modal dentro da área segura do viewport
- Manter `max-w-[calc(100vw-2rem)]` e `max-h-[calc(100dvh-2rem-var(--safe-area-top)-var(--safe-area-bottom))]`

A abordagem `fixed inset-0 m-auto` com `max-w` e `max-h` definidos centra o modal automaticamente na área disponível sem usar `translate`, garantindo que o `max-h` com safe areas funcione corretamente.

**Também verificar `src/components/ui/alert-dialog.tsx`** — aplicar a mesma correção ao `AlertDialogContent` que usa o mesmo padrão de posicionamento.

### Ficheiros
1. `src/components/ui/dialog.tsx` — corrigir posicionamento da variante `default`
2. `src/components/ui/alert-dialog.tsx` — corrigir posicionamento do `AlertDialogContent`

