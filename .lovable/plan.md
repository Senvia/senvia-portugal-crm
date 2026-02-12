

# Corrigir Valor do "Agendar Restante"

## Problema

O `ScheduleRemainingModal` recebe `summary.remaining` que calcula apenas `saleTotal - totalPaid`, ignorando os pagamentos ja agendados (pendentes). Deveria receber `summary.remainingToSchedule` que calcula `saleTotal - totalPaid - totalScheduled`.

Exemplo: Venda de 397. Pago: 198,50. Agendado: 100. O modal deveria mostrar 98,50 para agendar, mas esta a mostrar 198,50 (ignorando os 100 ja agendados).

## Alteracao

### `src/components/sales/SalePaymentsList.tsx`

Linha onde o `ScheduleRemainingModal` e chamado - trocar `summary.remaining` por `summary.remainingToSchedule`:

```
remainingAmount={Math.max(0, summary.remaining)}
```

passa a ser:

```
remainingAmount={Math.max(0, summary.remainingToSchedule)}
```

Uma unica linha a alterar.

