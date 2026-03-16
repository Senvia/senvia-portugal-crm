
Objetivo: mover o card `Renovações Pendentes` para a mesma linha do filtro de período no separador `Resumo`.

O que vou alterar
- Em `src/pages/Finance.tsx`, vou substituir o card atual do filtro por um layout em 2 colunas:
  - esquerda: filtro de período
  - direita: `RenewalAlertsWidget`
- Vou remover o `RenewalAlertsWidget` da secção inferior onde hoje aparece ao lado do gráfico de fluxo de caixa.

Abordagem de layout
- Mobile: os dois blocos ficam empilhados
- Desktop: ficam lado a lado
- Vou usar um grid/flex responsivo para manter o filtro compacto e deixar o card de renovações ocupar o espaço restante sem quebrar o topo da página

Ajustes visuais previstos
- Manter o filtro com o mesmo comportamento atual
- Garantir que o card de renovações continua funcional, apenas muda de posição
- Se necessário, ajustar larguras mínimas para o topo não ficar apertado com o date picker e o texto do filtro

Impacto esperado
- O alerta de renovações fica mais visível e contextual, junto do controlo de período
- O gráfico de fluxo de caixa passa a ocupar sozinho a área inferior, ficando visualmente mais limpo

Ficheiro principal
- `src/pages/Finance.tsx`

Nota técnica
- Não preciso mexer na lógica de dados nem no `RenewalAlertsWidget`; é apenas uma reorganização de layout no `Resumo`
