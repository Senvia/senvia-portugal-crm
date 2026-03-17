
Objetivo

Reestruturar o Portal Total Link para ficar com navegação por subpáginas e aspeto semelhante ao exemplo: tabs no topo, ação contextual por página e filtros de pesquisa consistentes em todas as secções.

O que vou construir

1. Estrutura por subrotas
- Trocar a página única atual por um layout-base do portal com subrotas:
  - `/portal-total-link/home`
  - `/portal-total-link/contratos`
  - `/portal-total-link/ids`
  - `/portal-total-link/pendentes`
  - `/portal-total-link/reclamacoes`
- Manter `/portal-total-link` a redirecionar para `home`.
- Preservar o acesso exclusivo Perfect2Gether no mesmo ponto de entrada.

2. Layout-base do portal
- Criar um container próprio do Portal Total Link com:
  - título do módulo
  - barra superior de tabs
  - botão de ação contextual à direita
  - área de filtros reutilizável
  - conteúdo principal da secção
- As tabs serão:
  - Home
  - Contratos
  - ID´s
  - Pendentes
  - Reclamações

3. Ações por secção
- Mostrar botão no topo conforme a tab ativa:
  - Home: sem ação principal
  - Contratos: “Adicionar”
  - ID´s: “Revisão”
  - Pendentes: “Pesquisar”
  - Reclamações: “Adicionar”
- Nesta fase os botões ficam preparados visualmente, sem integração funcional real.

4. Filtros globais reutilizáveis
- Criar um bloco comum de filtros visível em todas as páginas com:
  - Período
  - Cliente
  - Contrato
  - Vendedor
  - Ciclo
  - Ano
  - Estado comercial
  - Estado BO
- Reutilizar o `DateRangePicker` existente para período.
- Pesquisa por texto preparada para funcionar por:
  - cliente: nome + NIF
  - vendedor: accent-insensitive
- Usar `normalizeString` para ignorar acentos nas pesquisas de cliente e vendedor.

5. Conteúdo inicial apenas de estrutura
- Como pediste “só estrutura UI”, cada subpágina terá:
  - cabeçalho coerente com a secção
  - filtros comuns
  - estado vazio profissional
  - espaço pronto para futura tabela/listagem
- Não vou mockar dados nem ligar à API PHC nesta fase.

Abordagem técnica

```text
PortalTotalLinkLayout
├── Topbar com tabs (NavLink por rota)
├── Action button contextual
├── PortalTotalLinkFilters (reutilizável)
└── Outlet
    ├── HomePage
    ├── ContratosPage
    ├── IdsPage
    ├── PendentesPage
    └── ReclamacoesPage
```

Ficheiros mais prováveis
- `src/App.tsx`
- `src/pages/PortalTotalLink.tsx` ou conversão desta página para layout-base
- novos ficheiros em `src/pages/portal-total-link/*`
- novo componente partilhado, por exemplo:
  - `src/components/portal-total-link/PortalTotalLinkLayout.tsx`
  - `src/components/portal-total-link/PortalTotalLinkTabs.tsx`
  - `src/components/portal-total-link/PortalTotalLinkFilters.tsx`

Decisões de UX
- Em desktop, tabs horizontais no topo com botão da ação à direita.
- Em tablet/mobile, tabs com scroll horizontal para não quebrar layout.
- Filtros em grelha responsiva:
  - 1 coluna em mobile
  - 2-4 colunas em larguras médias
  - layout mais compacto em desktop
- Estado vazio simples em todas as páginas, evitando blocos temporários confusos.

Comportamento dos filtros nesta fase
- A UI dos filtros ficará pronta e consistente.
- Como ainda não há integração nem dados reais, os filtros não precisam de aplicar resultados reais já.
- Se fizer sentido, posso já deixá-los com estado persistido localmente para manter seleção ao navegar entre tabs; se quiseres manter a primeira versão mais leve, também posso deixar isso para a fase seguinte.

Resultado esperado
- O Portal Total Link deixa de parecer uma página provisória.
- Passa a existir como “mini-app” isolada dentro do produto.
- A navegação fica alinhada com o fluxo que descreveste.
- A estrutura fica pronta para depois ligar as listagens e a API PHC sem refazer a base visual.

Notas importantes
- O exemplo enviado serve bem como referência de estrutura, mas vou adaptar ao design system atual do projeto para manter consistência com o resto da app.
- Como ainda não existem docs/endpoints PHC, esta fase será 100% focada em arquitetura de navegação + filtros + placeholders certos.
