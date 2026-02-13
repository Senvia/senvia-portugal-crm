
# Melhorar responsividade dos cards financeiros

## Problema

A grid actual tem 7 cards numa unica linha em `xl`, o que os torna demasiado estreitos. Em resolucoes intermedias (`lg`), ficam 4 por linha com 3 em baixo, tambem apertados.

## Solucao

Reorganizar a grid com breakpoints mais graduais para que os cards tenham sempre espaco suficiente:

- **Mobile** (default): 2 colunas (ja esta bem)
- **md** (768px+): 3 colunas
- **lg** (1024px+): 4 colunas
- **xl** (1280px+): 4 colunas (manter 4, nao forcar 7)
- **2xl** (1536px+): 7 colunas (so em ecras largos)

Tambem reduzir ligeiramente o tamanho do valor nos cards para `text-xl` em vez de `text-2xl`, para caber melhor em espacos menores.

## Alteracao tecnica

### `src/pages/Finance.tsx`

Linha ~77 - alterar a classe da grid de:
```
grid-cols-2 lg:grid-cols-4 xl:grid-cols-7
```
para:
```
grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7
```

Opcionalmente, reduzir o `text-2xl` dos valores para `text-xl md:text-2xl` nos 7 cards para melhor legibilidade em ecras menores.

Um unico ficheiro alterado: `src/pages/Finance.tsx`.
