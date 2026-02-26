
## Problema: Modais fullScreen tapam o menu lateral

### Causa
O variant `fullScreen` do `DialogContent` usa `fixed inset-0` — ocupa o ecrã todo, cobrindo a sidebar (que tem `z-40`, o dialog tem `z-50`).

### Solução

**Ficheiro:** `src/components/ui/dialog.tsx`

Alterar o variant `fullScreen` para respeitar a sidebar no desktop:

```
fullScreen: "pointer-events-auto fixed inset-0 z-50 w-full h-full max-w-none bg-background ... md:left-64 md:w-[calc(100%-16rem)]"
```

Isto faz com que:
- **Mobile** (`< md`): modal ocupa o ecrã todo (correcto, não há sidebar)
- **Desktop** (`≥ md`): modal começa depois da sidebar (`left-64`) e tem largura ajustada

Também ajustar o `DialogOverlay` para o mesmo comportamento no desktop, para que o overlay escuro não cubra a sidebar:

```
md:left-64 md:w-[calc(100%-16rem)]
```

Alternativamente, manter o overlay a cobrir tudo (visual) mas garantir que o conteúdo do dialog fica ao lado da sidebar.

### Ficheiros afetados
| Ficheiro | Ação |
|---|---|
| `src/components/ui/dialog.tsx` | Ajustar classes do variant `fullScreen` para respeitar sidebar no desktop |
