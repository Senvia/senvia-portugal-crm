

# Corrigir cor de hover/foco nos Selects e dropdowns

## Problema

A cor de hover/foco nos itens de Select (e outros componentes como DropdownMenu, Command, etc.) esta a usar a cor `accent` que esta definida como azul primario (`217 91% 60%`) com texto branco. Isto cria um fundo azul forte que dificulta a leitura, especialmente quando os itens ja tem badges coloridas (como "Concluida", "Cancelado").

## Solucao

Alterar as variaveis CSS `--accent` e `--accent-foreground` em `src/index.css` para cores neutras subtis (cinza claro no modo claro, cinza escuro no modo dark), mantendo o `--primary` inalterado para botoes e elementos de destaque.

## Ficheiro a alterar

### `src/index.css`

**Modo claro (`:root`):**
- `--accent`: de `217 91% 60%` (azul) para `220 14% 96%` (cinza muito claro, igual ao `--secondary`)
- `--accent-foreground`: de `0 0% 100%` (branco) para `222 47% 11%` (escuro, igual ao `--foreground`)

**Modo dark (`.dark`):**
- `--accent`: de `217 91% 60%` (azul) para `222 47% 14%` (cinza escuro, igual ao `--secondary`)
- `--accent-foreground`: de `0 0% 100%` (branco) para `220 14% 96%` (claro, igual ao `--foreground`)

Isto afeta globalmente todos os componentes Shadcn que usam `bg-accent` / `text-accent-foreground` para hover/foco:
- Select
- DropdownMenu
- Command (combobox)
- ContextMenu
- Menubar
- NavigationMenu

Nenhum outro ficheiro precisa de ser alterado. Os botoes e elementos de destaque continuam a usar `--primary`.

