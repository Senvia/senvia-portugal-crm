
Objetivo

Adicionar interação na Home do Portal Total Link para que cada card possa alternar entre:
- vista Global
- vista Equipa

Comportamento confirmado
- O clique afeta apenas o card clicado.
- Para voltar a Global, cada card terá um botão visível “Voltar”/“Global”.

O que vou implementar

1. Estado por card na Home
- Em `src/pages/portal-total-link/Home.tsx`, guardar o modo de visualização de cada métrica individualmente.
- Exemplo:
  - Angariados = `global`
  - Adicionados = `global`
  - ao clicar em Angariados -> passa para `team`

2. Clique no gráfico/card
- Tornar a área do gráfico clicável.
- Ao clicar num card em modo Global:
  - o subtítulo muda de `Ciclo X / Ano Y - Global` para `Ciclo X / Ano Y - Equipa`
  - o gráfico deixa de mostrar `Objetivo / Ativos / Pendentes`
  - passa a mostrar as equipas/pessoas no eixo horizontal

3. Dados de equipa mockados
- Usar os nomes fornecidos como exemplo para a vista Equipa:
  - André Coelho
  - Carla Caralinda
  - Carla Pereira
  - Fernando Gama
  - Jorge Henriques
  - Marco Fernandes
  - Nuno Miguel Campos Silva
  - Parceiros
  - Pedro Manuel Bento Martins
  - Ricardo Cabral
  - Sara Dias
  - Sonia Dias
  - Susana Carapito
  - Vanda Barata
- Cada item terá valores de:
  - objetivo
  - ativos
  - pendentes

4. Estrutura do gráfico na vista Equipa
- O eixo horizontal passa a ter os rótulos da equipa/pessoa.
- A altura das barras representa os valores.
- Como cada equipa tem 3 métricas, vou adaptar o componente para suportar barras agrupadas:
  - Objetivo
  - Ativos
  - Pendentes

5. Evolução do `MiniBarChart`
- Atualizar `src/components/dashboard/MiniBarChart.tsx` para aceitar dois modos:
  - simples: uma barra por categoria (uso atual)
  - agrupado: três barras por equipa/pessoa
- Isto evita duplicar componente e mantém consistência visual.

6. Rodapé do card
- Na vista Global:
  - mantém o resumo final `Objetivo / Ativos / Pendentes`
- Na vista Equipa:
  - substituir esse rodapé por uma indicação contextual ou removê-lo para não repetir informação já mostrada no gráfico
- Vou optar pela versão mais limpa para não poluir o card.

Ficheiros a alterar
- `src/pages/portal-total-link/Home.tsx`
- `src/components/dashboard/MiniBarChart.tsx`

Detalhe técnico
```text
Card "Angariados"
├── Header
│   ├── título
│   ├── período
│   └── badge/estado Global ou Equipa
├── Conteúdo
│   ├── Global -> X axis = Objetivo, Ativos, Pendentes
│   └── Equipa -> X axis = nomes da equipa
└── Ações
    ├── clicar no gráfico -> abrir Equipa
    └── botão voltar -> regressar a Global
```

Resultado esperado
- Cada gráfico da Home fica interativo.
- O utilizador pode abrir detalhe por equipa apenas no card que quiser.
- A vista Equipa mostra corretamente os nomes no eixo horizontal e os valores na altura das barras.
- A Home fica pronta para depois ligar estes dados a dados reais do backend.
