

## Atualizar a tela em tempo real após sincronização

### Problema
Após clicar em "Sincronizar", o toast aparece confirmando a atualização, mas a tabela de comparação não atualiza automaticamente. A causa é que o `onSuccess` do `useSyncFileToSystem` invalida as queries em background, mas pode haver um timing issue onde o componente não re-renderiza com os dados atualizados.

### Solução

**Ficheiro: `src/components/finance/CommissionAnalysisTab.tsx`**

No `handleSync`, após o `mutateAsync` resolver com sucesso, chamar explicitamente o `refetch` do `useCommissionAnalysis` (que já está disponível no retorno do hook). Isto garante que os dados são buscados novamente e a UI atualiza imediatamente.

1. Desestruturar `refetch` do `useCommissionAnalysis` (linha 142):
   ```ts
   const { data, isLoading, refetch } = useCommissionAnalysis(selectedMonth, effectiveUserIds);
   ```

2. No `handleSync` (linha 174), após o `mutateAsync`, aguardar o `refetch`:
   ```ts
   await syncMutation.mutateAsync(syncItems);
   await refetch();
   toast({ ... });
   ```

Isto força o refetch completo de ambas as queries (live commissions + chargeback data) antes de mostrar o toast, garantindo que a UI já está atualizada quando o utilizador vê a confirmação.

### Ficheiros alterados
- `src/components/finance/CommissionAnalysisTab.tsx` — 2 linhas (desestruturar `refetch` + chamar após sync)

