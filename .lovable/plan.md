

## Manter Foco no Input Após Enviar Mensagem

### Problema

Quando o utilizador envia uma mensagem com Enter, o `handleSend` limpa o input e chama `sendMessage`, mas nada re-foca o campo de texto. O React re-renderiza o componente (nova mensagem + `isLoading` muda) e o foco perde-se.

### Solução

Adicionar `inputRef.current?.focus()` no final do `handleSend`, para que após enviar, o cursor volte automaticamente ao campo de texto. Também adicionar um `useEffect` que re-foca o input quando `isLoading` passa de `true` para `false` (ou seja, quando o Otto termina de responder), para o utilizador poder continuar a escrever imediatamente.

### Alteração — `src/components/otto/OttoChatWindow.tsx`

1. No `handleSend` (linha 41-46), adicionar `inputRef.current?.focus()` após o `sendMessage`:

```tsx
const handleSend = () => {
  const text = input.trim();
  if (!text || isLoading) return;
  setInput("");
  sendMessage(text);
  setTimeout(() => inputRef.current?.focus(), 0);
};
```

2. Adicionar um `useEffect` para re-focar quando `isLoading` volta a `false`:

```tsx
useEffect(() => {
  if (!isLoading) {
    inputRef.current?.focus();
  }
}, [isLoading]);
```

### Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/otto/OttoChatWindow.tsx` | Adicionar focus no handleSend + useEffect para re-focar após resposta |

