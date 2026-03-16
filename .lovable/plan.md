
Objetivo

Reorganizar a área de filtros em `Prospects` para ficar assim:
1. logo abaixo dos cards, no lado direito: botões de `Importar` e `Exportar`
2. dentro do card da lista:
   - 1ª linha: pesquisa por texto ocupando a largura toda
   - 2ª linha: filtro de Comerciais, filtro de `COM` e botão `Distribuir leads`

O que vou alterar

1. Reorganizar o topo da página
- Manter os 3 cards de métricas.
- Criar uma linha logo abaixo deles com os botões de ação alinhados à direita:
  - `Importar`
  - `Exportar CSV`
  - `Exportar Excel`
- Em mobile, estes botões passam a empilhar ou quebrar linha de forma limpa.

2. Reestruturar os filtros dentro do card
- A pesquisa por texto passa a ficar sozinha numa linha inteira.
- Na linha de baixo:
  - filtro de Comerciais
  - filtro de `COM`
  - botão `Distribuir leads`
- Vou ajustar as classes responsivas para:
  - desktop: layout em linha, bem distribuído
  - tablet/mobile: stack vertical sem apertar os campos

3. Adicionar filtro de `COM`
- Criar um novo estado, por exemplo `comFilter`.
- Gerar as opções dinamicamente a partir dos prospects usando `getProspectCom(prospect)`.
- Incluir opção “Todos” e, se fizer sentido, também “Sem COM”.

4. Atualizar a lógica de filtragem
- O `filteredProspects` passará a considerar:
  - pesquisa de texto
  - comercial selecionado
  - `COM` selecionado
- O filtro de `COM` usará o helper existente `getProspectCom`, para funcionar com os dados já guardados em `metadata.com`.

5. Melhorar a ação de exportação
- Posso manter CSV e Excel como dois botões separados no topo direito, porque foi isso que já existe hoje.
- Se preferires depois, isso pode virar um único botão “Exportar” com dropdown, mas nesta alteração eu manteria o comportamento atual para não mexer no fluxo.

Ficheiro principal

- `src/pages/Prospects.tsx`

Detalhe técnico

- Novo estado:
  - `const [comFilter, setComFilter] = useState("all")`
- Nova lista memoizada:
  - opções únicas de `COM` com base em `getProspectCom(prospect)`
- Novo critério no filtro:
  - `matchesCom = comFilter === "all" || getProspectCom(prospect) === comFilter`
- Estrutura visual prevista:
```text
[ Cards ]

                           [Importar] [CSV] [Excel]

[ Pesquisa........................................ ]

[ Comercial........ ] [ COM............. ] [ Distribuir leads ]
```

Resultado esperado

- A pesquisa fica mais destacada e fácil de usar.
- Os filtros ficam organizados como pediste.
- O filtro de `COM` permite isolar rapidamente `CONCORRÊNCIA`, `EDPC`, etc.
- Os botões de importar/exportar deixam de competir com os filtros e passam para a zona superior direita.
