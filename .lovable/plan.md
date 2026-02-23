

# Corrigir Cores do Onboarding Wizard

## Problema
O wizard de onboarding usa tokens CSS do sidebar (`bg-sidebar-background`, `bg-sidebar-accent/50`, `text-sidebar-foreground`, etc.) que sao cores escuras (navy). Mas o componente tem `bg-sidebar-background` no container principal que deveria criar um fundo escuro. O resultado visual mostra cards cinzentos "lavados" num fundo claro, o que indica que o estilo dark do sidebar nao esta a ser aplicado corretamente ao overlay full-screen.

## Solucao
Substituir todos os tokens `sidebar-*` no `OnboardingWizard.tsx` por tokens do tema principal (`background`, `foreground`, `card`, `muted`, `border`, `primary`) para que o wizard fique visualmente consistente com o resto da aplicacao. Alternativa: forcar o fundo escuro com classes Tailwind directas (ex: `bg-[hsl(222,47%,8%)]`), mas e mais limpo usar os tokens standard.

## Alteracoes

### Ficheiro: `src/components/onboarding/OnboardingWizard.tsx`

Substituir as classes CSS:

| De (sidebar tokens) | Para (tokens standard) |
|---|---|
| `bg-sidebar-background` | `bg-background` |
| `border-sidebar-border` | `border-border` |
| `text-sidebar-foreground` | `text-foreground` |
| `text-sidebar-muted` | `text-muted-foreground` |
| `bg-sidebar-accent/50` | `bg-card` |
| `bg-sidebar-accent` | `bg-muted` |
| `bg-sidebar-background/60` | `bg-background/60` |

Isto fara com que o wizard use o tema claro da aplicacao (fundo branco, cards brancos com border, texto escuro) - ficando visualmente consistente com o design do Senvia OS.

Os cards de nicho terao fundo branco com border suave, hover com sombra, e o texto sera legivel. As badges de etapas do pipeline mantem as cores proprias (ja vem inline do template).
