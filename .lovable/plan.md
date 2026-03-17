
Objetivo

Refazer a aba “Análise de Comissões” para ficar mais compacta e escalável quando houver muitos comerciais, substituindo os cards individuais por tabela e simplificando o topo.

O que vou alterar

1. Trocar os cards dos comerciais por tabela
- Substituir a grelha atual de cards por uma tabela única com uma linha por comercial.
- Colunas previstas:
  - Comercial
  - Comissão €
  - Base
  - Chargeback €
  - Chargebacks qtd
  - Diferencial €
  - Diferencial qtd
- Ordenação inicial continua por maior impacto de chargeback.
- A pesquisa por nome mantém-se.

2. Deixar os 3 indicadores principais na mesma linha
- Manter apenas:
  - Comissões
  - Chargebacks
  - Diferencial
- Remover os cards:
  - Imports
  - Sem match
- Ajustar o grid para priorizar uma única linha em desktop e continuar responsivo em ecrãs menores.

3. Remover a secção/card de importações
- Eliminar completamente o bloco “Últimas importações”.
- O fluxo de importação continua disponível apenas pelo botão “Importar ficheiro”.

4. Melhorar legibilidade para equipas grandes
- A tabela vai ocupar melhor o espaço horizontal e evitar blocos longos repetidos.
- Em mobile:
  - manter scroll horizontal da tabela, aproveitando o `Table` já existente no projeto
  - esconder/encurtar colunas menos prioritárias se necessário
- Em desktop:
  - tabela completa, mais densa e fácil de comparar entre 20-30 colaboradores.

5. Ajustar estados de loading e vazio
- Trocar os skeletons dos cards individuais por skeleton de tabela/lista.
- Manter estado vazio simples quando não houver dados para mostrar.

Ficheiro principal a alterar
- `src/components/finance/CommissionAnalysisTab.tsx`

Abordagem técnica
```text
Topo:
[título + descrição] [botão importar]

Filtros:
[mês] [equipa] [pesquisa]

Resumo:
[Comissões] [Chargebacks] [Diferencial]

Conteúdo principal:
tabela de comerciais

Remover:
- card Imports
- card Sem match
- lista “Últimas importações”
- cards individuais por comercial
```

Resultado esperado
- A página fica mais limpa e profissional.
- Escala bem para 30+ colaboradores.
- Comparar valores entre comerciais torna-se muito mais fácil.
- Mantém o import e os filtros, mas sem ocupar espaço com blocos pouco úteis.
