
# Auto-sugerir Parcela Restante Apos Edicao de Pagamento

## Problema
Quando o utilizador edita um pagamento agendado (ex: de 198,50 para 100), o sistema deveria detetar automaticamente que existe um valor em falta (98,50) para cobrir o total da venda e sugerir a criacao de uma nova parcela.

## Solucao

### `src/components/sales/AddPaymentModal.tsx`

Adicionar um callback `onEditComplete` que e chamado apos uma edicao bem-sucedida, passando o novo valor do pagamento.

### `src/components/sales/SalePaymentsList.tsx`

1. Adicionar um estado `pendingScheduleAfterEdit` (boolean)
2. No `AddPaymentModal`, ao fechar apos edicao com sucesso, verificar se `remainingToSchedule > 0` usando os dados atualizados
3. Como o React Query invalida os dados apos o update, usar um `useEffect` que:
   - Observa quando `pendingScheduleAfterEdit === true` E os pagamentos ja foram recarregados
   - Recalcula `remainingToSchedule` com os novos dados
   - Se `remainingToSchedule > 0`, abre automaticamente o `ScheduleRemainingModal`
   - Reseta o flag

### Fluxo do Utilizador

```text
1. Utilizador edita pagamento de 198,50 para 100
2. Clica "Guardar Alteracoes"
3. Modal de edicao fecha
4. Sistema recalcula: total=397, pago=198.50, agendado=100, em falta=98.50
5. ScheduleRemainingModal abre automaticamente com 98.50 pre-preenchido
6. Utilizador pode agendar 1-4 parcelas ou clicar "Ignorar"
```

### Detalhes Tecnicos

**AddPaymentModal** - Alterar `onSuccess` do `updatePayment.mutate`:
- Chamar um novo callback `onEditSuccess?.()` antes de fechar o modal

**SalePaymentsList** - Alteracoes:
1. Novo estado: `const [promptScheduleAfterEdit, setPromptScheduleAfterEdit] = useState(false)`
2. No `AddPaymentModal` `onOpenChange`, quando fecha apos edicao:
   - Ativar flag `setPromptScheduleAfterEdit(true)`
3. `useEffect` que observa `[promptScheduleAfterEdit, summary.remainingToSchedule]`:
   - Se `promptScheduleAfterEdit && summary.remainingToSchedule > 0` -> abrir `setShowScheduleModal(true)` e resetar flag
   - Se `promptScheduleAfterEdit && summary.remainingToSchedule <= 0` -> apenas resetar flag

Isto garante que apos qualquer edicao que crie um "buraco" no plano de pagamentos, o sistema sugere imediatamente preencher esse valor.
