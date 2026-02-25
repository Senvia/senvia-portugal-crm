

## Auto-Scroll nas Conversas do Otto

### Problema

O `scrollRef` está no `div` interior dentro do `ScrollArea`, mas o elemento que realmente faz scroll é o **viewport** do Radix ScrollArea. Atribuir `scrollTop` ao div interior não tem efeito.

### Solução

Mudar a abordagem para encontrar o viewport real do ScrollArea e fazer scroll nele.

### Alteração — `src/components/otto/OttoChatWindow.tsx`

1. Trocar o `scrollRef` de `HTMLDivElement` para apontar ao `ScrollArea` root
2. No `useEffect`, navegar até o viewport real (`.querySelector('[data-radix-scroll-area-viewport]')`) e fazer `scrollTo({ top: scrollHeight, behavior: 'smooth' })`
3. Adicionar `isLoading` como dependência do useEffect para também fazer scroll quando o indicador de "a escrever..." aparecer

```tsx
// Antes:
const scrollRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const el = scrollRef.current;
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}, [messages]);

// Depois:
const scrollAreaRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const viewport = scrollAreaRef.current?.querySelector(
    '[data-radix-scroll-area-viewport]'
  );
  if (viewport) {
    setTimeout(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }, 50);
  }
}, [messages, isLoading]);
```

4. Mover o `ref` do `div` interior para o `ScrollArea`:

```tsx
// Antes:
<ScrollArea className="flex-1">
  <div ref={scrollRef} className="p-4 space-y-4">

// Depois:
<ScrollArea ref={scrollAreaRef} className="flex-1">
  <div className="p-4 space-y-4">
```

O `setTimeout` de 50ms garante que o DOM já renderizou o conteúdo novo antes de calcular o `scrollHeight`. O `behavior: 'smooth'` dá uma animação suave.

### Ficheiro a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/otto/OttoChatWindow.tsx` | Trocar ref para ScrollArea, usar viewport real para scroll |

