
Objetivo

Completar a vista “Equipa” na Home do Portal Total Link, adicionando uma tabela de valores por equipa por baixo do gráfico detalhado em cada card.

O que encontrei
- Em `src/pages/portal-total-link/Home.tsx`, a vista Equipa já mostra o gráfico agrupado e o botão “Voltar ao Global”.
- Falta o bloco tabular com os valores por colaborador/equipa.
- O projeto já tem componentes de tabela prontos em `src/components/ui/table.tsx` e exemplos visuais em `TeamPerformanceTable.tsx`.

O que vou implementar

1. Adicionar a tabela na vista Equipa
- Em cada card que estiver em modo `team`, por baixo do gráfico vou inserir uma tabela com:
  - Equipa
  - Objetivo
  - Ativos
  - Pendentes

2. Reaproveitar os dados já existentes
- Vou usar o array `teamBreakdown` já presente na Home.
- Cada linha da tabela corresponderá exatamente aos mesmos dados usados no gráfico de equipas.

3. Formatação dos valores
- Vou apresentar `objetivo`, `ativos` e `pendentes` em moeda euro no formato pt-PT.
- Isto alinha a tabela com os valores que me enviaste (`0,00 €`, `67,49 €`, etc.).

4. Ajuste de layout do card
- A vista Equipa ficará com esta estrutura:
```text
Header
Gráfico por equipa
Tabela por equipa
Linha inferior com texto + botão “Voltar ao Global”
```
- Se necessário, aumento ligeiramente a altura do gráfico ou o espaçamento para o card continuar legível.

5. Consistência visual
- Vou usar os componentes `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`.
- As colunas numéricas ficam alinhadas à direita, como já acontece noutras tabelas do projeto.

Ficheiro a alterar
- `src/pages/portal-total-link/Home.tsx`

Resultado esperado
- Ao clicar num gráfico e abrir a vista Equipa, o utilizador passa a ver:
  - o gráfico detalhado por colaborador
  - a tabela com os respetivos valores logo por baixo
- Isto fica disponível em todos os cards do Portal, mas apenas no card que foi aberto em modo Equipa.
