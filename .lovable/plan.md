

## Tornar os widgets de alertas scrollaveis e mostrar todos os itens

### Problema

Ambos os widgets (CPE/CUI a Expirar e Proximos Eventos) cortam a lista a 3 itens por secao com `.slice(0, 3)`. Alem disso, no widget de Eventos, a secao "Proximos 7 dias" so mostra itens se a secao "Hoje" estiver vazia. Resultado: quando ha muitos alertas, o utilizador nao consegue ver todos.

### Solucao

1. Remover os `.slice(0, 3)` -- mostrar todos os itens
2. Mostrar sempre todas as secoes (Hoje + Proximos / Expirados + Urgentes + Proximos)
3. Adicionar `ScrollArea` com altura maxima para que o widget nao cresça infinitamente e permita scroll interno

### Alteracoes

**Ficheiro: `src/components/dashboard/FidelizationAlertsWidget.tsx`**

- Envolver o `CardContent` com `ScrollArea` (max-height ~300px)
- Remover os `.slice(0, 3)` das 3 secoes (expired, urgent, upcoming)
- Remover a condicao que esconde o conteudo de "upcoming" quando existem itens expired/urgent

**Ficheiro: `src/components/dashboard/CalendarAlertsWidget.tsx`**

- Envolver o `CardContent` com `ScrollArea` (max-height ~300px)
- Remover os `.slice(0, 3)` das 2 secoes (today, upcoming)
- Remover a condicao `todayEvents.length === 0` que escondia os itens de "Proximos 7 dias"

### Resultado esperado

Ambos os widgets mostram **todos** os alertas/eventos, organizados por secao, com scroll interno quando a lista ultrapassa a altura maxima do card.

