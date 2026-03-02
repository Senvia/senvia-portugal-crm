

## Correção das Regras de Comissão

### Regras corretas (confirmadas pelo utilizador)

| Tipo | Comissão | Conta para Totalizador (Volume MWh)? |
|------|----------|--------------------------------------|
| Angariação | 100% | Sim |
| Ang. Indexado | 100% | Sim |
| **Sem Volume** | **100%** | **Não** |
| **Renovação** | **25%** | **Não** |

### O que está errado agora
No `useLiveCommissions.ts`, linhas 179-180, **todos** os tipos de negociação somam `consumo_anual` ao totalizador de volume (`totalGlobalKwh` e `entry.totalConsumoKwh`). Precisamos excluir `sem_volume` e `renovacao`.

O multiplicador de `sem_volume: 1` já está correto (100%). O de `renovacao: 0.25` também está correto (25%).

### Alteração (1 ficheiro)

**`src/hooks/useLiveCommissions.ts`** — linhas 177-180:
- Só somar `consumo` ao `entry.totalConsumoKwh` e `totalGlobalKwh` quando `negotiation_type` **não** é `sem_volume` nem `renovacao`
- Usar o `negotiation_type` da proposta (já disponível via `proposalNegotiationMap`) para decidir

```typescript
const negType = proposalNegotiationMap.get(cpe.proposal_id) || '';
const countsForVolume = negType !== 'sem_volume' && negType !== 'renovacao';
if (countsForVolume) {
  entry.totalConsumoKwh += consumo;
  totalGlobalKwh += consumo;
}
```

Isto faz com que o Totalizador EE (MWh) e o patamar de volume só reflitam angariações e ang. indexado.

