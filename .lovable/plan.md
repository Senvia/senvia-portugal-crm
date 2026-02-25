

## Simplificar Métodos de Comissão para 4 Tipos

### Entendimento

Reduzir os 6 métodos actuais para apenas **4 métodos**, todos usando a tabela de escalões por kWp. Remover `per_kwp`, `fixed` e `manual`.

### Os 4 Métodos

1. **Escalões por kWp** (`tiered_kwp`)
   - Fórmula: `Comissão = Base + (kWp - kWpMin) × Adicional`
   - Tabela com escalões kWp, valores Base e Adicional (Trans. e AAS)

2. **Base + € × kWp** (`base_plus_per_kwp`)
   - Fórmula: `Comissão = Base + (Taxa × kWp total)`
   - Mesma tabela de escalões

3. **Fórmula kWp + Percentagem** (`formula_percentage`) — NOVO
   - kWp é calculado por fórmula: `(Valor × Factor) / Divisor` (configurável por produto, ex: Condensadores `(valor × 0.67) / 1000`)
   - Comissão = percentagem a definir na tabela, aplicada ao resultado
   - Mesma tabela de escalões (Base Trans. = % Trans., Base AAS = % AAS)

4. **% da Venda/Proposta** (`percentage_valor`)
   - Fórmula: `Comissão = Valor da Proposta × %`
   - Mesma tabela de escalões (Base = percentagem)

### Ficheiros a alterar

**`src/hooks/useCommissionMatrix.ts`**
- Remover métodos `per_kwp`, `fixed`, `manual` do tipo `CommissionRule`
- Adicionar `formula_percentage` ao tipo
- Implementar cálculo: usa `kwpAuto` do `SERVICOS_PRODUCT_CONFIGS` para derivar kWp, depois aplica percentagem do tier

**`src/components/settings/CommissionMatrixTab.tsx`**
- `ALL_METHODS` passa a ter 4 entradas
- `METHOD_LABELS` actualizado
- `getFormulaPreview` actualizado
- `getTierCount` mostra contagem para todos os métodos (não só `tiered_kwp`)
- Título da tabela muda conforme o método (ex: "Base Trans. (%)" para métodos de percentagem)

### Detalhe técnico

Para o método 3 (`formula_percentage`), a fórmula de cálculo do kWp já existe no `SERVICOS_PRODUCT_CONFIGS` (campo `kwpAuto`). Os cabeçalhos da tabela para este método mostrarão "% Trans." e "% AAS" em vez de "Base Trans. (€)" e "Base AAS (€)", dado que o valor é uma percentagem.

Os dados existentes no banco (9 escalões do Solar) mantêm-se intactos. Produtos que usavam `per_kwp`, `fixed` ou `manual` serão tratados como `percentage_valor` por defeito.

