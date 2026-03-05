

## Fix: Modal a sobrepor safe area do iPhone

### Problema

O modal `default` (centrado) usa `max-h-[calc(100dvh-2rem)]` — em iPhones com notch/Dynamic Island, os `2rem` nao sao suficientes para evitar sobreposicao com a barra de status (bateria, hora, rede).

A classe `safe-top` adiciona `padding-top` ao conteudo interno do modal, mas o **container** do modal continua a poder estender-se ate ao topo do ecra.

### Solucao

Alterar a variante `default` do `DialogContent` em `src/components/ui/dialog.tsx` (linha 15) para usar safe area no calculo da altura maxima:

**De:**
```
max-h-[calc(100dvh-2rem)]
```

**Para:**
```
max-h-[calc(100dvh-2rem-var(--safe-area-top)-var(--safe-area-bottom))]
```

Isto garante que o modal centrado nunca ultrapassa a safe area, independentemente do dispositivo. O `safe-top`/`safe-bottom` no padding interno continua a funcionar para o conteudo.

### Ficheiro

| Ficheiro | Alteracao |
|---|---|
| `src/components/ui/dialog.tsx` | Linha 15: actualizar `max-h` da variante `default` para incluir `--safe-area-top` e `--safe-area-bottom` |

