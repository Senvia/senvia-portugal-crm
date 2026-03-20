

## Corrigir: comissão dos CPEs não recalcula ao editar Consumo/DBL/Margem

### Problema
A comissão de cada CPE de energia só é calculada **uma vez** — na inicialização (useEffect linha 191). Quando o utilizador altera Consumo, DBL ou Margem nos campos editáveis, nada recalcula a comissão. Os onChange (linhas 877-889) apenas atualizam o valor individual sem disparar recálculo.

### Solução

**Ficheiro: `src/components/sales/EditSaleModal.tsx`**

1. Adicionar um novo `useEffect` que recalcula a comissão de cada CPE de energia sempre que `editableCpes` mudar:
   - Só dispara para `proposal_type === 'energia'` e quando `hasEnergyConfig` é true
   - Para cada CPE com `margem > 0`, recalcula a comissão usando `calcCommissionRef.current(margem, getVolumeTier(consumo_anual))`
   - Usa uma flag/ref para evitar loop infinito (o effect altera `editableCpes` que dispara o effect novamente):
     - Comparar comissão calculada com a existente — só atualizar se diferente
     - Ou usar um ref `skipRecalc` que se liga ao set e desliga após o recálculo

2. Abordagem concreta (sem loop infinito):
   - Mover o recálculo para dentro dos próprios `onChange` handlers dos campos `consumo_anual`, `margem` e `dbl`
   - Quando o utilizador altera um desses campos, recalcular `comissao` inline no mesmo update de estado
   - Isto é mais simples e não cria dependências circulares

3. Nos onChange de `consumo_anual` e `margem` (linhas 877 e 885):
   ```ts
   onChange={e => {
     const u = [...editableCpes];
     const newMargem = /* valor atualizado */;
     const newConsumo = /* valor atualizado */;
     let newComissao = u[idx].comissao;
     if (hasEnergyConfigRef.current && newMargem > 0) {
       const calc = calcCommissionRef.current(newMargem, getVolumeTier(newConsumo || 0));
       if (calc !== null) newComissao = calc;
     }
     u[idx] = { ...u[idx], campo: valor, comissao: newComissao };
     setEditableCpes(u);
   }}
   ```

4. O campo Comissão (€) continua editável manualmente (para override), mas recalcula automaticamente quando Consumo ou Margem mudam.

### Ficheiros alterados
- `src/components/sales/EditSaleModal.tsx` — onChange handlers dos campos consumo_anual e margem nos CPEs

