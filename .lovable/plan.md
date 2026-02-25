

## Todos os Produtos Usam a Tabela de Escalões

### Entendimento

Actualmente, apenas o método `tiered_kwp` (Solar) mostra a tabela de escalões. Os outros métodos (base_plus_per_kwp, percentage_valor, etc.) mostram campos simples. O utilizador quer que **todos os produtos** usem a mesma tabela de escalões — a diferença entre produtos é apenas a **fórmula de cálculo** aplicada aos valores da tabela.

### O que muda

1. **`src/components/settings/CommissionMatrixTab.tsx`**
   - Remover a condicional `{rule.method === 'tiered_kwp' && ...}` — a `TieredTableEditor` aparece **sempre** (excepto `manual`)
   - Remover os blocos de UI separados para `base_plus_per_kwp`, `percentage_valor`, `per_kwp` e `fixed` (os campos simples)
   - Manter o selector de método e o preview da fórmula

2. **`src/hooks/useCommissionMatrix.ts`**
   - Ajustar os métodos `base_plus_per_kwp`, `percentage_valor`, `per_kwp` e `fixed` para ler valores a partir de `rule.tiers` em vez de `rule.base`/`rule.rate`/`rule.ratePerKwp`
   - A lógica de lookup do tier pelo kWp aplica-se a todos; o que muda é como o `base`/`adic` são usados na fórmula final

3. **Tipos (`src/hooks/useCommissionMatrix.ts`)**
   - Todos os `CommissionRule` passam a ter `tiers: SolarTier[]` — simplificar para um tipo único com `method` + `tiers`
   - Remover `base`, `rate`, `ratePerKwp` dos tipos separados (já estão nos tiers)

4. **Base de dados**
   - Converter os valores actuais (Baterias: base=10, ratePerKwp=2; Condensadores/Carregadores/Coberturas: rate=5) para o formato de tiers
   - Exemplo Baterias: cada tier terá `baseTransaccional=10, adicTransaccional=2`
   - Exemplo Condensadores: cada tier terá os campos adaptados à percentagem

### Detalhe técnico

Antes de implementar, preciso confirmar: os 9 escalões do Solar (com os mesmos ranges kWp) são copiados para todos os produtos, mas com valores diferentes nas colunas Base/Adic? Ou cada produto pode ter ranges kWp diferentes?

A implementação assume que a tabela é igual para todos (6 colunas: kWp Min, kWp Max, Base Trans., Adic. Trans., Base AAS, Adic. AAS) e o método define como esses valores alimentam a fórmula.

