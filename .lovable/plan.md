

## Redesign dos Seletores Ciclo/Ano

Tornar os seletores compactos e inline, em vez de blocos empilhados com labels grandes.

### Alterações em `PortalTotalLinkLayout.tsx` (linhas 45-78)

Substituir o bloco grid atual por uma linha horizontal compacta:

- Remover as labels separadas (`<span>Ciclo</span>`, `<span>Ano</span>`)
- Usar `flex items-center gap-2` em vez de `grid` com `space-y-2`
- Reduzir altura dos SelectTrigger de `h-11` para `h-9`
- Remover `min-w` fixos, usar larguras mais justas (`w-[120px]` e `w-[90px]`)
- Adicionar um separador visual discreto (um `·` ou `|` em `text-muted-foreground`) entre os dois selects
- O texto do placeholder já inclui "Ciclo X" e "2025", tornando as labels redundantes

**Resultado**: dois selects pequenos lado a lado no canto superior direito, discretos e elegantes, sem labels volumosas.

