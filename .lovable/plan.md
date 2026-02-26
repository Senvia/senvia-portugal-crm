
Objetivo
- Garantir que o cálculo de comissão de energia usa exatamente a configuração gravada da organização (sem sobrescrita acidental e sem ambiguidade na UI).

Estado atual confirmado
- Na configuração gravada de energia, o patamar Low está em `source: from_mid` com `operation: divide` e `value: 1.33`.
- Existe um risco real de perda da configuração `ee_gas`: ao guardar produto individual em `CommissionMatrixTab`, hoje é enviado apenas `localMatrix` (sem `ee_gas`).

Plano de implementação (curto e direto)
1) Corrigir persistência da matriz para nunca perder `ee_gas`
- Arquivo: `src/components/settings/CommissionMatrixTab.tsx`
- Ajustar `handleSave` (save por produto) para sempre enviar `commission_matrix` completo:
  - `{ ...localMatrix, ee_gas: localEnergy }`
- Manter o mesmo comportamento no `handleSaveEnergy`.

2) Normalizar leitura da configuração de energia no runtime
- Arquivo: `src/hooks/useCommissionMatrix.ts`
- Criar normalizador de `energyConfig` antes do cálculo:
  - Se `ee_gas` existir, usar os dados gravados.
  - Completar apenas campos faltantes de `tierRules` de forma segura (sem ignorar regra existente).
- Garantir que `calculateEnergyCommission` use somente essa configuração normalizada.

3) Tornar explícita a regra efetiva usada no cálculo (transparência)
- Arquivos:
  - `src/components/proposals/ProposalCpeSelector.tsx`
  - `src/components/sales/CreateSaleModal.tsx` (e onde houver recálculo visível)
- Exibir texto curto no resumo da comissão:
  - Ex.: `Patamar: Low | Regra: from_mid ÷ 1.33` ou `from_mid (sem operação)`.
- Mobile-first, sem modal lateral, mantendo layout atual responsivo.

4) Validar consistência end-to-end
- Cenários:
  - A) Low + from_mid + divide 1.33 → comissão reduzida vs Mid.
  - B) Low + from_mid + none → comissão igual à Mid.
  - C) Guardar produto de serviços e confirmar que `ee_gas` permanece intacto.
  - D) Reabrir proposta/venda e confirmar mesmo resultado após reload.

Detalhes técnicos (para evitar regressão)
- Não há alteração de schema de base de dados.
- Não mexer em `src/integrations/supabase/client.ts` nem em ficheiros auto-gerados.
- A lógica de patamar por consumo permanece:
  - Low: `<= 300 MWh`, Mid: `301–600 MWh`, High: `> 600 MWh`.
- Fórmula permanece:
  - `Comissão = ValorAjustado + (Margem - marginMin) * (PonderadorAjustado / 100)`.

Resultado esperado após implementação
- O sistema passa a refletir fielmente o que está guardado na configuração da organização.
- Sem perda silenciosa de `ee_gas` ao guardar outros blocos da matriz.
- Fica visível para o time comercial qual regra exata foi aplicada em cada cálculo.
