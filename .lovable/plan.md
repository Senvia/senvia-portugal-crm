
# Corrigir Posicionamento do Modal "Adicionar Receita"

## Problema
O `DialogContent` usa a variante `fullScreen` com overrides `md:` para aparecer como modal centrado em desktop. No entanto, o `md:inset-auto` remove o posicionamento `inset-0` do fullScreen, e as propriedades `md:left-[50%] md:top-[50%]` com `translate` nao conseguem centrar corretamente porque ha conflito com os estilos base da variante.

## Solucao
Simplificar a abordagem: usar a variante `default` (que ja esta centrada) e aplicar `fullScreen` apenas em mobile via classes responsivas.

## Alteracao

### Ficheiro: `src/components/finance/AddRevenueModal.tsx`

Linha 59 — substituir:
```tsx
<DialogContent variant="fullScreen" className="md:fixed md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-md md:h-auto md:rounded-lg md:border md:inset-auto">
```

Por:
```tsx
<DialogContent variant="fullScreen" className="md:inset-auto md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-md md:h-auto md:max-h-[90vh] md:rounded-lg md:border">
```

A diferenca principal e adicionar `md:max-h-[90vh]` para limitar a altura em desktop e garantir que o posicionamento funcione. Se ainda houver conflito, a alternativa mais segura sera trocar a abordagem completamente:

```tsx
<DialogContent className="fixed inset-0 z-50 bg-background md:inset-auto md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-md md:h-auto md:rounded-lg md:border">
```

Isto remove a dependencia da variante `fullScreen` e controla tudo via classes utilitarias, garantindo fullscreen em mobile e modal centrado em desktop — o mesmo padrao usado noutros modais do projeto.
