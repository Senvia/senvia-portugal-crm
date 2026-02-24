

## Widgets compactos com modal de detalhe ao clicar

### Conceito

Voltar aos widgets pequenos e compactos no dashboard -- mostrando apenas um resumo (titulo + contagem total + preview dos primeiros 2-3 itens). Ao clicar no widget inteiro, abre um modal fullScreen com a lista completa organizada por secoes, com scroll e todas as acoes disponiveis.

### Alteracoes

**Ficheiro: `src/components/dashboard/FidelizationAlertsWidget.tsx`**

1. Tornar o widget compacto:
   - Card pequeno mostrando apenas o titulo, badge com total de alertas, e um resumo dos primeiros 2 itens (apenas nome do cliente + data)
   - Remover o `ScrollArea` e a listagem completa do card
   - Todo o card e clicavel (cursor pointer)

2. Adicionar estado `modalOpen` para controlar o modal

3. Criar o modal (fullScreen) com:
   - Header com titulo e badge total
   - `ScrollArea` com todas as 3 secoes (Expirados, Urgentes, Proximos 30 dias)
   - Cada item com os botoes de "Renovar" e "Alterar Comercializador"
   - Cada item clicavel para navegar ao cliente

**Ficheiro: `src/components/dashboard/CalendarAlertsWidget.tsx`**

1. Tornar o widget compacto:
   - Card pequeno mostrando titulo, badge total, e preview dos primeiros 2 eventos (apenas titulo + hora)
   - Remover o `ScrollArea` e listagem completa
   - Todo o card e clicavel

2. Adicionar estado `modalOpen`

3. Criar o modal (fullScreen) com:
   - Header com titulo e badge
   - `ScrollArea` com as 2 secoes (Hoje, Proximos 7 dias)
   - Cada evento clicavel para navegar ao calendario

### Estrutura do widget compacto

```text
+--------------------------------------+
| [icon] CPE/CUI a Expirar        [12] |
| ------------------------------------ |
| Cliente A - 28/02/2026               |
| Cliente B - 01/03/2026               |
| + 10 mais...                         |
+--------------------------------------+
```

### Estrutura do modal

```text
+------------------------------------------+
| [X]  CPE/CUI a Expirar            [12]  |
|------------------------------------------|
| -- Expirados (3)                         |
|   [card com acoes]                       |
|   [card com acoes]                       |
|   [card com acoes]                       |
|                                          |
| -- Urgente 7 dias (4)                    |
|   [card com acoes]                       |
|   ...                                    |
|                                          |
| -- Proximos 30 dias (5)                  |
|   [card com acoes]                       |
|   ...                                    |
+------------------------------------------+
```

### Detalhes tecnicos

- Usar `Dialog` com `variant="fullScreen"` (ja existe no projeto)
- Manter toda a logica de dados existente (hooks, tipos)
- Os modais de Renovar/Alterar continuam a funcionar dentro do modal de lista
- Preview no widget: `.slice(0, 2)` apenas para o resumo visual
- Texto "Ver todos" ou "+ N mais..." como indicador de que ha mais itens
