
Objetivo

Atualizar a Home do Portal Total Link para deixar de usar o empty state e passar a ter:
- seletor de ciclo e seletor de ano no topo direito
- grelha de gráficos logo abaixo
- resumo final em cada gráfico com “Objetivo / Ativos / Pendentes”

Decisões confirmadas
- Os seletores de ciclo e ano da Home serão independentes dos filtros globais já existentes.
- Os filtros globais da página continuam visíveis por baixo do header, como hoje.

O que vou construir

1. Substituir a Home atual
- Trocar `src/pages/portal-total-link/Home.tsx`, que hoje usa `PortalTotalLinkEmptyState`, por uma página própria com layout de dashboard.

2. Topo da Home
- Na zona onde normalmente apareceria o botão de ação, mostrar:
  - Select “Ciclo” com opções de 1 a 13
  - Select “Ano” com opção inicial como 2026
- Estes dois controlos terão estado local da própria Home, sem mexer nos filtros globais do portal.

3. Bloco de gráficos
- Criar uma grelha responsiva com 5 cards:
  - Angariados
  - Adicionados
  - Fidelizados
  - Residêncial
  - Novos NIFs
- Cada card mostrará:
  - título do indicador
  - subtítulo com ciclo/ano selecionados + “Global”
  - gráfico visual
  - rodapé com 3 métricas: Objetivo, Ativos, Pendentes

4. Estrutura visual dos cards
- Reaproveitar os componentes já existentes do projeto para manter consistência:
  - `Card` para os blocos
  - `Select` para os filtros do topo
  - `MiniBarChart` para os gráficos
- Como esta fase é só UI, os dados dos gráficos e das métricas serão mockados/localmente no ficheiro da Home.

5. Ajuste do layout base
- Em `PortalTotalLinkLayout.tsx`, a Home deixará de mostrar botão de ação no topo.
- O conteúdo específico da Home fica todo dentro da própria página, sem alterar as outras tabs.

Abordagem técnica

```text
PortalTotalLinkLayout
├── Header do portal + tabs
├── Filtros globais existentes
└── Home
    ├── toolbar própria (Ciclo + Ano)
    └── grid de 5 chart cards
        ├── gráfico
        └── Objetivo | Ativos | Pendentes
```

Ficheiros a alterar
- `src/pages/portal-total-link/Home.tsx`
- possivelmente pequeno ajuste em `src/components/portal-total-link/PortalTotalLinkLayout.tsx` apenas se for necessário refinar o header da secção Home

Resultado esperado
- A Home passa a parecer um dashboard operacional.
- Os seletores de ciclo/ano ficam no topo da Home, independentes dos filtros gerais.
- Cada gráfico termina com o resumo “Objetivo / Ativos / Pendentes”, pronto para no futuro receber dados reais.
