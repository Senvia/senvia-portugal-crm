
Objetivo

Corrigir dois problemas distintos nos Prospects:
1. mostrar finalmente o valor da coluna `COM` no sistema;
2. permitir reimportar o mesmo ficheiro para atualizar os registos já existentes.

O que confirmei no código e nos dados

- A importação já está a ler `COM` corretamente em `src/lib/prospects/import.ts`.
- Na base de dados, os 150 prospects já têm `metadata.com` preenchido:
  - 125 com `CONCORRÊNCIA`
  - 25 com `EDPC`
- O motivo de “não aparecer” é este:
  - a UI mostra `segment`
  - os teus registos já têm `segment` preenchido com valores como `Ouro`, `Prata`, `B2C`
  - por isso o fallback para `metadata.com` nunca entra
- O motivo de “não consegui importar de novo” é este:
  - `useImportProspects()` faz deduplicação prévia por `NIF+CPE` e email
  - quando encontra um registo existente, marca como `skipped/ignorado`
  - não existe hoje nenhum modo de atualizar registos já existentes

O que vou implementar

1. Mostrar `COM` como campo próprio na lista
- Em vez de tentar meter `COM` dentro de `Segmento`, vou expor `COM` como coluna própria.
- Assim ficas com ambos visíveis:
  - `Segmento` → Ouro / Prata / B2C
  - `COM` → CONCORRÊNCIA / EDPC
- Isto resolve o problema real sem esconder informação.

2. Mostrar `COM` também no mobile e na exportação
- Atualizar a tabela desktop e os cards mobile em `src/pages/Prospects.tsx`
- Atualizar `src/lib/export.ts` para exportar uma coluna `COM`
- Resultado: o que vês no sistema bate certo com o CSV/Excel

3. Permitir reimportação com atualização dos existentes
- Alterar `useImportProspects()` para:
  - procurar correspondência por `NIF + CPE`
  - se não houver, tentar por email
  - se existir, fazer `update` desse prospect em vez de ignorar
  - se não existir, fazer `insert`
- Como pediste “Atualizar tudo”, os updates vão refrescar:
  - empresa
  - contacto
  - email
  - telefone
  - nif / cpe
  - segmento
  - `metadata.com`
  - consumo anual
  - observações
  - ficheiro de origem / importador
- Não vou mexer em campos operacionais como:
  - `assigned_to`
  - `assigned_at`
  - `converted_to_lead`
  - `converted_lead_id`
  - `converted_at`

4. Ajustar o resumo da importação
- Hoje o resultado só mostra:
  - importados
  - ignorados
  - falhados
- Vou passar a mostrar:
  - novos importados
  - atualizados
  - ignorados
  - falhados
- Isto evita a sensação de que “não fez nada” quando na verdade atualizou registos.

5. Manter a importação robusta
- Continuar a aceitar aliases flexíveis para `COM`
- Manter dedupe seguro
- Usar update por `id` do registo já encontrado, em vez de depender de um `upsert` cego
- Isto é mais seguro aqui porque existem duas regras de unicidade diferentes e uma delas é parcial

Ficheiros a ajustar

- `src/hooks/useProspects.ts`
- `src/pages/Prospects.tsx`
- `src/lib/export.ts`
- `src/types/prospects.ts`
- possivelmente `src/lib/prospects/segment.ts` para separar melhor helpers de `segment` e `com`

Resultado esperado

- Vais passar a ver a coluna `COM` no sistema com `CONCORRÊNCIA` ou `EDPC`
- Os valores atuais já guardados passam a aparecer sem precisares de os perder
- Quando reimportares o mesmo ficheiro, os prospects existentes deixam de ser ignorados e passam a ser atualizados
- `Segmento` e `COM` ficam ambos preservados, em vez de um esconder o outro

Detalhe técnico

Não preciso de alterar a estrutura da base de dados para isto.
O valor `COM` já existe em `metadata.com`; o que falta é:
- expô-lo na UI/export
- mudar a lógica de importação de “skip duplicate” para “update existing record”
