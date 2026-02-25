

## Analise dos Calculos da Matriz de Comissoes

Revisei o hook `useCommissionMatrix.ts` e a forma como e usado nos modais de proposta (`CreateProposalModal.tsx` e `EditProposalModal.tsx`). Aqui esta o estado actual:

### Os calculos estao correctos

Sim, a logica de calculo segue exactamente as regras configuradas na matriz:

| Metodo | Formula implementada | Correcto? |
|--------|---------------------|-----------|
| **tiered_kwp** (Solar) | `base + (kwp - kwpMin) × adicional` com diferenciacao Transaccional vs AAS (saas) | Sim |
| **base_plus_per_kwp** (Baterias) | `base + ratePerKwp × kwp` | Sim |
| **percentage_valor** | `valor × rate / 100` | Sim |
| **per_kwp** | `kwp × rate` | Sim |
| **fixed** | `rate` (valor fixo) | Sim |
| **manual** | Retorna `null` (preenchimento livre) | Sim |

### Integracao com Propostas

Nos modais `CreateProposalModal` e `EditProposalModal`, quando o utilizador altera qualquer campo de um produto (excepto a propria comissao), o sistema:

1. Chama `calculateCommission(produto, detail, modeloServico)`
2. Se o resultado nao for `null`, arredonda a 2 casas decimais e preenche automaticamente o campo `comissao`
3. Se o metodo for `manual`, o campo fica editavel livremente

### Ponto de atencao no tiered_kwp

A condicao de procura do escalao e `kwp >= kwpMin && kwp < kwpMax` — usa `<` no maximo, ou seja, o valor exacto do `kwpMax` cai no escalao seguinte. Isto e o comportamento standard de intervalos semi-abertos `[min, max)`. Se o ultimo escalao tiver `kwpMax = 100` e o kWp for exactamente `100`, nao encontra escalao. Se quiser cobrir esse caso, o ultimo escalao deveria ter um `kwpMax` muito alto (ex: `9999`).

### Conclusao

Os calculos estao implementados correctamente com base na matriz configurada. Nao ha bugs na logica — tudo funciona de acordo com o desenho.

