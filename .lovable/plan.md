
Objetivo: fazer a “Análise de Comissões” mostrar exatamente o valor da coluna **“Valor a receber”** (campo `proposal_cpes.comissao`), sem recalcular por matriz de margem.

Diagnóstico confirmado:
- Os dados no banco estão corretos para as vendas 0021–0025 (ex.: 549.76, 2590.19, -178.35 etc.).
- O valor fica “minúsculo” porque o frontend está a recalcular:
  - `useLiveCommissions.ts` recalcula `comissao_final` pela matriz (`calculateEnergyCommissionPure(...)`).
  - `useCommissionAnalysis.ts` usa `commercial.totalFinal` como base da análise.
- Resultado: na análise, aparece valor derivado da matriz (centavos/euros baixos), e não o “Valor a receber” importado.

Plano de implementação:
1) Ajustar a base da análise para usar comissão indicativa (valor real a receber)
- Arquivo: `src/hooks/useCommissionAnalysis.ts`
- Trocar:
  - `commissionAmount: commercial.totalFinal`
  por
  - `commissionAmount: commercial.totalIndicativa`
- Manter contagem base por `commercial.cpes.length`.
- Recalcular `differentialAmount` com essa nova base (`commissionAmount - chargebackAmount`).

2) Deixar explícito na UI que a base é “Valor a receber”
- Arquivo: `src/components/finance/CommissionAnalysisTab.tsx`
- Atualizar texto/label da coluna:
  - de “Comissão €” para algo como “Comissão Base (€)” ou “Valor a receber (€)”.
- Ajustar descrição curta no topo para evitar ambiguidade futura.

3) Validar resultado no mês de março/2026
- Confirmar que o total de comissão base na análise reflete exatamente a soma dos 8 CPEs:
  - **€3.939,77** (incluindo o valor negativo de -178,35).
- Confirmar que “Diferencial” = “Comissão Base” - “Chargeback”.
- Confirmar que não há impacto na aba “Comissões” (telecom) nem no cálculo de fechamento mensal (continuam com lógica própria).

Detalhes técnicos:
- Não precisa migração de esquema nem alteração de dados.
- Mudança é apenas de regra de apresentação/agrupamento na análise.
- Impacto controlado: somente a aba “Análise de Comissões” passa a refletir a coluna `comissao` (valor real do ficheiro) como base comparativa contra chargebacks.
