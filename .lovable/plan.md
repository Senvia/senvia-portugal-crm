
Objetivo

Ajustar o bloco “B) Ritmo” para que:
- OP signifique apenas oportunidades abertas
- contem só propostas com estado:
  - `sent`
  - `negotiating`
- seja removida a 3.ª coluna “OP” antes de “Comissão”, porque não faz sentido ter OP de comissão

O que confirmei no código

- O bloco afetado está em `src/components/dashboard/MetricsPanel.tsx`
- As OP do ritmo vêm de `proposalsRaw`
- Neste momento o query já está alinhado com “abertas”, porque usa:
  - `status in ["sent", "negotiating"]`
- A coluna extra vem de:
  - `opComissao`
  - cabeçalho com um 3.º “OP”
  - células e total dessa coluna em “B) Ritmo”
  - percentagem dessa coluna em “C) Concretização das Métricas”

Plano de implementação

1. Assumir oficialmente “OP = oportunidades abertas”
- Manter a contagem baseada só em propostas abertas
- Não incluir `draft`, `accepted`, `rejected` nem `expired`

2. Remover a 3.ª coluna de OP
- Tirar o cabeçalho “OP” que hoje aparece antes de “Comissão”
- Tirar `opComissao` das linhas da tabela
- Tirar `opComissao` dos totais
- Tirar também essa coluna da secção “C) Concretização das Métricas”, para manter coerência visual

3. Manter Comissão como valor direto
- A coluna “Comissão” continua a mostrar apenas o valor monetário
- Sem um contador de OP associado à comissão

4. Limpar a lógica interna
- Remover o cálculo de `opComissao` do tipo `RitmoRow`
- Remover as somas correspondentes em `sumRitmo`
- Ajustar os headers e as linhas para ficarem com esta estrutura:
  - Consultor
  - OP
  - Energia
  - OP
  - Solar
  - Comissão

Ficheiro a alterar

- `src/components/dashboard/MetricsPanel.tsx`

Resultado esperado

No bloco “B) Ritmo”:
- Energia continua com:
  - OP
  - Energia
- Solar continua com:
  - OP
  - Solar
- Comissão fica só com:
  - Comissão
- desaparece a 3.ª coluna de OP

Nota técnica

A parte de “somente propostas abertas” já está praticamente correta no query atual. A mudança principal é remover a noção artificial de “OP de comissão” do UI e da agregação local, sem necessidade de alterar base de dados.
