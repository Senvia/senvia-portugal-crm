

## Auditoria: Erros encontrados nos widgets e componentes recentes

### Erro 1 - Console: "Function components cannot be given refs" no CalendarAlertsWidget

**Causa**: O `DialogHeader` no `dialog.tsx` (linha 53) e uma funcao simples, nao usa `React.forwardRef`. Quando o Radix Dialog tenta passar uma ref para este componente, gera o warning. Isto acontece em ambos os widgets (`CalendarAlertsWidget` e `FidelizationAlertsWidget`).

**Correcao**: Converter `DialogHeader` para usar `React.forwardRef` no ficheiro `src/components/ui/dialog.tsx`.

---

### Erro 2 - Console: "Missing Description or aria-describedby" nos modais fullScreen

**Causa**: Os modais fullScreen dos dois widgets usam `DialogTitle` mas nao incluem `DialogDescription`. O Radix Dialog exige que cada `DialogContent` tenha um `DialogDescription` ou um `aria-describedby={undefined}` explicito para acessibilidade.

**Correcao**: Adicionar `DialogDescription` (pode ser visualmente oculto com `sr-only`) dentro dos `DialogContent` de ambos os widgets, ou passar `aria-describedby={undefined}` ao `DialogContent`.

---

### Erro 3 - `renderEvent` usa `key` dentro do JSX retornado (nao no `.map()`)

**Ficheiro**: `CalendarAlertsWidget.tsx`, linha 83

**Causa**: A funcao `renderEvent` retorna um `<button key={event.id}>`, mas a `key` deve ser passada no ponto onde `.map()` e chamado, nao dentro da funcao. Quando se chama `renderEvent(e, 'today')` dentro de um `.map()`, o React nao reconhece a key corretamente porque esta dentro do componente retornado e nao no callsite do map.

**Correcao**: Remover `key` do `<button>` dentro de `renderEvent` e adicionar `key` ao wrapping do `.map()`, ex: `<React.Fragment key={e.id}>{renderEvent(e, 'today')}</React.Fragment>`.

---

### Erro 4 - Duplo import de `useState` e `useMemo`

**Ficheiro**: `CalendarAlertsWidget.tsx`, linhas 1 e 10

**Causa**: `useState` e importado na linha 1 e `useMemo` na linha 10, separados. Nao causa erro de runtime mas e um padrao inconsistente -- os dois podem ser importados no mesmo statement.

**Correcao**: Juntar os imports: `import { useState, useMemo } from 'react'`.

---

### Resumo das alteracoes

| Ficheiro | Alteracao |
|---|---|
| `src/components/ui/dialog.tsx` | Converter `DialogHeader` e `DialogFooter` para `forwardRef` |
| `src/components/dashboard/CalendarAlertsWidget.tsx` | Adicionar `DialogDescription` ao modal; corrigir keys no `.map()`; juntar imports de React |
| `src/components/dashboard/FidelizationAlertsWidget.tsx` | Adicionar `DialogDescription` ao modal |

Todas as correcoes sao menores e nao alteram funcionalidade -- apenas resolvem warnings de consola e melhoram acessibilidade.

