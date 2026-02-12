
# Fix: "Parcelado" abre o modal errado na criacao de venda

## Problema

Ao clicar "Parcelado" no seletor de tipo de pagamento, abre o mesmo modal de pagamento unico ("Adicionar Pagamento") em vez do assistente de parcelas. Isto acontece porque ambas as opcoes (`onSelectTotal` e `onSelectInstallments`) executam a mesma acao: abrir o `AddDraftPaymentModal`.

## Solucao

### 1. Criar componente `DraftScheduleModal`

Criar um novo componente baseado no `ScheduleRemainingModal`, mas adaptado para o fluxo de criacao (draft). Em vez de gravar diretamente na base de dados, devolve um array de `DraftPayment[]` ao componente pai.

**Ficheiro: `src/components/sales/DraftScheduleModal.tsx`**

- Recebe `remainingAmount` e callback `onAdd(payments: DraftPayment[])`
- Interface identica ao `ScheduleRemainingModal`: selector 1-4 parcelas, datas individuais, metodo de pagamento
- Ao confirmar, gera os `DraftPayment` objects com `status: 'pending'` e chama `onAdd`
- Usa `AlertDialog` (em vez de `Dialog`) para evitar conflitos de focus-trap com o modal pai de criacao

### 2. Integrar no `CreateSaleModal`

**Ficheiro: `src/components/sales/CreateSaleModal.tsx`**

- Adicionar estado `showDraftScheduleModal`
- `onSelectInstallments` abre o `DraftScheduleModal` em vez do `AddDraftPaymentModal`
- `onSelectTotal` continua a abrir o `AddDraftPaymentModal` (comportamento atual, correto)
- O callback `onAdd` do `DraftScheduleModal` faz `setDraftPayments(prev => [...prev, ...newPayments])`

## Detalhe tecnico

```text
Clique "Adicionar Pagamento"
       |
  PaymentTypeSelector
       |
  +----+----+
  |         |
Total    Parcelado
  |         |
AddDraft  DraftSchedule  (NOVO)
Modal     Modal
  |         |
  +----+----+
       |
  draftPayments[]
```

| Ficheiro | Alteracao |
|---|---|
| `src/components/sales/DraftScheduleModal.tsx` | Novo componente (baseado no ScheduleRemainingModal, mas gera DraftPayment[] sem gravar na DB) |
| `src/components/sales/CreateSaleModal.tsx` | Adicionar estado + ligar onSelectInstallments ao novo modal |
