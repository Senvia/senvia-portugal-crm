

## Auditoria Completa: Safe Areas em Modais Fullscreen

### Componentes Afetados

**19 modais fullscreen** usam `variant="fullScreen"` no `DialogContent` — todos partilham o mesmo problema: em mobile (iPhone), o conteúdo do header fica por trás do notch/Dynamic Island e o footer pode ficar por trás do home indicator.

Lista completa:
- CreateSaleModal, EditSaleModal, SaleDetailsModal
- LeadDetailsModal, AddLeadModal
- ClientDetailsDrawer, EditClientModal, CreateClientModal
- CreateProposalModal, EditProposalModal, ProposalDetailsModal
- CampaignDetailsModal
- CalendarAlertsWidget (modal interno)
- CommissionMatrixTab (2 modais)
- OnboardingWizard (não usa Dialog, mas `fixed inset-0`)
- PaymentOverdueBlocker, TrialExpiredBlocker (centrados, menos críticos)

### Causa Raiz

O variant `fullScreen` no `dialog.tsx` é `fixed inset-0` sem qualquer padding para safe areas. O botão X já usa `top-safe` (funciona), mas o conteúdo dos filhos (headers, footers) não tem safe area.

### Solução Centralizada

Em vez de corrigir 19+ ficheiros individualmente, a correção é feita **no próprio `dialog.tsx`**: adicionar `pt-safe` e `pb-safe` ao variant `fullScreen`, mas apenas em mobile (sem a media query `md:`).

**Ficheiro: `src/components/ui/dialog.tsx`**

Alterar o variant `fullScreen` para incluir safe area padding no container:

```
fullScreen: "pointer-events-auto fixed inset-0 z-50 w-full h-full max-w-none bg-background duration-200 ... md:left-64 md:w-[calc(100%-16rem)]"
```

Adicionar ao `DialogContent` quando `variant === "fullScreen"`: aplicar inline styles para `paddingTop` e `paddingBottom` usando `env(safe-area-inset-*)` apenas em mobile. Isto garante que:
- O header de qualquer modal fullscreen fica abaixo do notch
- O footer/botões ficam acima do home indicator
- Em desktop (`md:`) não há efeito (sidebar já ocupa o espaço)

Alternativa mais simples: adicionar as classes CSS `safe-top safe-bottom` directamente ao variant fullScreen. Como já existem na CSS (`padding-top: var(--safe-area-top)`) e são resetadas em print, é a abordagem mais limpa.

**Ficheiro: `src/components/onboarding/OnboardingWizard.tsx`**

Este componente não usa `Dialog` — usa `fixed inset-0` directamente. Necessita de safe area no header manualmente (inline style como no Otto).

**Ficheiros: `PaymentOverdueBlocker.tsx`, `TrialExpiredBlocker.tsx`**

Conteúdo centrado com `p-4` — menos crítico mas adicionar `safe-top safe-bottom` para consistência.

### Resumo das Alterações

| Ficheiro | Alteração |
|---|---|
| `dialog.tsx` | Adicionar safe area padding ao variant fullScreen (corrige 19 modais de uma vez) |
| `OnboardingWizard.tsx` | Adicionar safe area ao header (inline style) |
| `PaymentOverdueBlocker.tsx` | Adicionar classes safe-top/safe-bottom |
| `TrialExpiredBlocker.tsx` | Adicionar classes safe-top/safe-bottom |

Total: 4 ficheiros editados, 19+ modais corrigidos.

