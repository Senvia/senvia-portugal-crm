
Objetivo: redesenhar os gráficos do Portal Total Link para um visual mais profissional, mantendo barras verticais na vista Global e melhorando a comparação clara na vista por equipa.

Plano proposto

1. Redesenhar o card inteiro
- Dar ao card um visual mais “premium moderno”: menos ruído visual, melhor espaçamento, hierarquia mais limpa e superfícies mais leves.
- Substituir o aspeto de “bloco grande vazio” por uma composição em 3 zonas:
  - topo: título + contexto do ciclo/ano + badge da vista
  - centro: gráfico
  - base: resumo compacto dos 3 indicadores

2. Melhorar a vista Global
- Manter barras verticais, mas com acabamento mais elegante:
  - barras mais estreitas e com cantos suaves
  - mais espaço entre colunas
  - grelha horizontal muito suave
  - eixo Y com euros mais discretos
  - tooltip mais refinado
- Transformar os cards “Objetivo / Ativos / Pendentes” de baixo em KPI pills/cartões compactos, menos altos e mais sofisticados.
- Adicionar legenda visual pequena com pontos/linhas de cor para reforçar:
  - Objetivo = azul
  - Ativos = verde
  - Pendentes = laranja

3. Melhorar a vista por equipa
- Como há muitos nomes, a prioridade será legibilidade:
  - reduzir peso visual das barras
  - aumentar altura útil do gráfico
  - melhorar rotação/alinhamento dos labels
  - suavizar grelha e eixo
- Avaliar trocar o agrupado atual por uma versão mais limpa com:
  - barras finas
  - maior espaçamento entre equipas
  - legenda no topo
  - tooltip bem formatado em euro
- Manter a tabela abaixo, mas com o gráfico mais leve para não competir com ela.

4. Evoluir o componente de gráfico
- Refatorar `MiniBarChart.tsx` para suportar um estilo mais profissional sem quebrar o resto:
  - variante visual “portal”
  - legenda opcional
  - tooltip customizado
  - controlo mais fino de largura das barras e gaps
  - melhor formatação do eixo Y
- Reaproveitar o sistema já existente em `src/components/ui/chart.tsx` para tooltips/legendas com acabamento melhor, em vez de deixar o gráfico “cru”.

5. Ajustes visuais específicos
- Remover fundos pesados atrás do gráfico quando estiverem a deixá-lo “feio”.
- Melhorar paddings laterais e superiores.
- Ajustar largura máxima do conteúdo interno para o gráfico respirar melhor dentro do full width.
- Afinar tipografia dos labels e dos valores em baixo.

Arquivos a mexer
- `src/pages/portal-total-link/Home.tsx`
- `src/components/dashboard/MiniBarChart.tsx`
- possivelmente aproveitar utilitários de `src/components/ui/chart.tsx`

Direção visual recomendada
Com base nas suas escolhas, eu seguiria esta solução:
- estilo: Premium moderno
- global: barras verticais
- equipa: comparação clara
- resultado esperado: gráficos mais finos, mais limpos, com melhor acabamento, melhor eixo/legenda/tooltip e cards inferiores mais elegantes.

Sem mudanças de backend
- Isso é 100% visual/componente. Não precisa alterar base de dados nem autenticação.

Critérios de sucesso
- o gráfico deixa de parecer “esticado” e pesado
- as colunas ficam visualmente proporcionais
- a leitura de Objetivo / Ativos / Pendentes fica imediata
- a vista por equipa continua clara mesmo com muitos nomes
- o card parece dashboard executivo, não protótipo

Sugestão de implementação
- Fase 1: redesenhar só 1 card piloto
- Fase 2: aplicar o mesmo padrão aos 5 cards
- Fase 3: refinar a vista por equipa e a tabela

Se eu implementar, vou seguir exatamente essa direção visual: mais executivo, premium e com barras verticais mais elegantes.
