

## Auditoria de Bugs Identificados

### Bug 1: MobileHeader não tem botão de menu (hamburger)
O `MobileHeader` recebe `onMenuToggle` como prop mas **não renderiza nenhum botão** para ativá-lo. O header mostra apenas o logo centrado. O `MobileMenu` nunca é acessível — o utilizador não consegue ver o seu perfil, trocar de organização, ou fazer logout em mobile (a menos que use o MobileBottomNav para ir a Definições).

**Ficheiro:** `src/components/layout/MobileHeader.tsx`
**Correção:** Adicionar um botão hamburger à esquerda que chama `onMenuToggle`.

### Bug 2: Double safe-area padding no AddRevenueModal
O `AddRevenueModal` usa `variant="fullScreen"` (que agora tem `safe-top`) E aplica `pt-safe` no `DialogHeader`. Isto resulta em **padding duplo** no topo em iPhone — o container já tem ~47px de safe-area E o header adiciona mais ~40px.

**Ficheiro:** `src/components/finance/AddRevenueModal.tsx`
**Correção:** Remover `pt-safe` do `DialogHeader` (já está coberto pelo variant).

### Bug 3: Fullscreen modals sem `p-0 gap-0` têm padding inconsistente
Alguns modais fullscreen não usam `p-0 gap-0`, resultando em padding default do `DialogContent` (p-6 gap-4) MAIS o safe-area padding — criando espaçamento excessivo:
- `CalendarAlertsWidget` — sem `p-0 gap-0`
- `FidelizationAlertsWidget` — sem `p-0 gap-0`

**Correção:** Adicionar `p-0 gap-0` a estes modais para consistência com o padrão.

### Bug 4: Modais Marketing sem `gap-0`
- `CreateCampaignModal` — tem `p-0` mas falta `gap-0`
- `CampaignDetailsModal` — tem `p-0` mas falta `gap-0`
- `ListDetailsModal` — tem `p-0` mas falta `gap-0`
- `ImportContactsModal` — tem `p-0` mas falta `gap-0`

**Correção:** Adicionar `gap-0` a todos.

### Bug 5: MobileMenu não mostra todos os módulos
O `MobileMenu` só mostra 3 itens fixos (Painel, Leads, Definições) enquanto o `MobileBottomNav` mostra todos os módulos. O menu deveria ser o lugar completo de navegação com acesso a perfil/logout — mas está incompleto.

**Nota:** Isto é mais uma limitação de design do que bug — o BottomNav já cobre a navegação. Mas o menu deveria pelo menos mostrar funcionalidades que o BottomNav não tem (perfil, logout). Como já tem isso, o menu está funcional mas **não acessível** por causa do Bug 1.

### Resumo de Correções

| Ficheiro | Correção |
|---|---|
| `MobileHeader.tsx` | Adicionar botão hamburger (Menu icon) que chama `onMenuToggle` |
| `AddRevenueModal.tsx` | Remover `pt-safe` do DialogHeader (evitar padding duplo) |
| `CalendarAlertsWidget.tsx` | Adicionar `p-0 gap-0` ao DialogContent fullScreen |
| `FidelizationAlertsWidget.tsx` | Adicionar `p-0 gap-0` ao DialogContent fullScreen |
| `CreateCampaignModal.tsx` | Adicionar `gap-0` ao DialogContent |
| `CampaignDetailsModal.tsx` | Adicionar `gap-0` ao DialogContent |
| `ListDetailsModal.tsx` | Adicionar `gap-0` ao DialogContent |
| `ImportContactsModal.tsx` | Adicionar `gap-0` ao DialogContent |

Total: 8 ficheiros, 8 correções cirúrgicas.

