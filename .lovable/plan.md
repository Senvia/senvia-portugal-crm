

## Redesenho da Pagina Matriz de Comissoes — Modais por Produto + Tabela de Escaloes

### Problema actual

Todos os produtos (Solar, Carregadores/Baterias, Condensadores, Coberturas) aparecem empilhados verticalmente na pagina. Com muitos escaloes Solar, a pagina fica enorme e dificil de gerir. Alem disso, os escaloes usam cards individuais em vez de uma tabela compacta.

### Solucao

Redesenhar `CommissionMatrixTab.tsx` com duas alteracoes principais:

**1. Pagina principal: Grid de cards compactos (um por produto)**

Cada produto aparece como um card pequeno com:
- Icone representativo (Sun para Solar, Battery para Baterias, Gauge para Condensadores, Home para Coberturas)
- Nome do produto
- Metodo de calculo actual (badge)
- Numero de escaloes configurados (se aplicavel)
- Botao/click para abrir o modal de edicao

**2. Modal fullScreen por produto**

Ao clicar num card, abre um modal `fullScreen` (padrao do projeto) com:
- Selector de metodo de calculo
- Para `tiered_kwp`: **tabela horizontal** com colunas fixas (kWp Min, kWp Max, Base Trans., Adic. Trans., Base AAS, Adic. AAS, Acoes) e cada escalao como uma **linha da tabela**
  - Em mobile: tabela com scroll horizontal
  - Botao "Adicionar Linha" abaixo da tabela
  - Abaixo da tabela: formula de calculo (Info box)
- Para outros metodos: campos normais (Base, Taxa, Percentagem) + formula
- Botao "Guardar" no footer do modal

### Alteracoes por ficheiro

**`src/components/settings/CommissionMatrixTab.tsx`** — Redesenho completo

- Pagina principal: grid `grid-cols-2 sm:grid-cols-4` de cards clicaveis
- Estado `openProduct: string | null` para controlar qual modal esta aberto
- Componente `ProductModal`: Dialog fullScreen com o conteudo de edicao
- `TieredEditor` redesenhado: usa `Table` / `TableHeader` / `TableBody` / `TableRow` / `TableCell` do shadcn em vez de cards empilhados
  - Colunas: kWp Min | kWp Max | Base Trans. (EUR) | Adic. Trans. (EUR/kWp) | Base AAS (EUR) | Adic. AAS (EUR/kWp) | (trash icon)
  - Cada escalao = uma linha
  - Em mobile: wrapper com `overflow-x-auto` para scroll horizontal
- Abaixo da tabela: bloco com icone Info + texto da formula
- `DecimalInput` mantido sem alteracoes

### Icones por produto

```text
Solar          → Sun (lucide)
Carregadores   → Battery (lucide)  
Condensadores  → Gauge (lucide)
Coberturas     → Home (lucide)
```

### Fluxo do utilizador

```text
1. Entra em Definicoes > Matriz de Comissoes
2. Ve 4 cards compactos (Solar, Baterias, Condensadores, Coberturas)
3. Clica no card "Solar"
4. Abre modal fullscreen com tabela de escaloes
5. Adiciona/edita linhas na tabela
6. Ve a formula abaixo da tabela
7. Clica "Guardar"
8. Modal fecha, card actualiza o resumo
```

### Detalhes tecnicos

- Apenas 1 ficheiro alterado: `CommissionMatrixTab.tsx`
- Reutiliza componentes existentes: `Dialog`, `Table`, `DecimalInput`
- O `DecimalInput` (com suporte a 0 e virgulas) nao e alterado
- Dados continuam guardados no mesmo `commission_matrix` JSONB

