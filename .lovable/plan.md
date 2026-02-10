

## Agendamento automatico do restante apos pagamento parcial

### Conceito

Quando o utilizador regista um pagamento com valor inferior ao total da venda, o sistema deteta automaticamente que ha um valor em falta e abre um segundo modal a perguntar como quer tratar o restante. O fluxo e simples e rapido:

```text
Registar Pagamento (ex: 400 de 1200)
         |
         v
  "Restam 800. Como quer dividir?"
         |
    +---------+---------+
    |         |         |
  1 parcela  2 parcelas  3 parcelas
    |         |         |
    v         v         v
 [Data]   [Data 1]   [Data 1]
          [Data 2]   [Data 2]
                     [Data 3]
         |
         v
   Parcelas criadas automaticamente
   como pagamentos "Agendado"
```

### Como funciona

**1. Apos fechar o AddPaymentModal com sucesso:**
- O `SalePaymentsList` deteta que ainda ha valor em falta (`remaining > 0`)
- Abre automaticamente um novo modal: `ScheduleRemainingModal`

**2. O ScheduleRemainingModal e simples:**
- Mostra o valor restante (ex: "Restam 800,00")
- Selector de numero de parcelas: 1x, 2x, 3x, 4x (botoes simples)
- O valor e dividido igualmente (ex: 3x = 266,67 + 266,67 + 266,66)
- Para cada parcela, mostra um campo de data (pre-preenchido com intervalos de 30 dias)
- Metodo de pagamento opcional (herdado do pagamento original ou seleccionavel)
- Botao "Agendar Parcelas" e "Ignorar" (caso o cliente nao queira agendar agora)

**3. Ao confirmar:**
- Cria N registos na tabela `sale_payments` com status `pending` (agendado)
- O trigger existente `trg_sync_sale_payment_status` atualiza automaticamente o `payment_status` da venda para `partial`

### Alteracoes

**Novo ficheiro: `src/components/sales/ScheduleRemainingModal.tsx`**

- Props: `open`, `onOpenChange`, `saleId`, `organizationId`, `remainingAmount`, `defaultPaymentMethod`
- State: `installments` (1-4), `dates[]`, `paymentMethod`
- Logica de divisao: valor total / N parcelas, ultima parcela absorve centimos restantes
- Datas pre-preenchidas: hoje + 30 dias, + 60 dias, etc.
- Usa `useCreateSalePayment` para criar cada parcela

**Ficheiro: `src/components/sales/SalePaymentsList.tsx`**

- Adicionar state `showScheduleModal` 
- Apos o `AddPaymentModal` fechar com sucesso (onOpenChange false + remaining > 0), abrir o `ScheduleRemainingModal`
- Importar e renderizar o novo modal

**Ficheiro: `src/components/sales/AddPaymentModal.tsx`**

- Adicionar callback `onSuccess` opcional para notificar o componente pai que o pagamento foi criado com sucesso (e qual o valor pago)
- Chamar `onSuccess` apos `createPayment.mutate` com sucesso

### Contexto da criacao de venda (CreateSaleModal / AddDraftPaymentModal)

O mesmo comportamento aplica-se ao `AddDraftPaymentModal` usado na criacao de vendas:
- Apos adicionar um draft payment com valor parcial, abrir um modal equivalente para agendar as parcelas restantes como drafts
- Reutilizar a mesma logica de divisao em parcelas

| Ficheiro | Alteracao |
|---|---|
| `ScheduleRemainingModal.tsx` (novo) | Modal com selector de parcelas (1-4x) e datas |
| `SalePaymentsList.tsx` | Abrir modal de agendamento apos pagamento parcial |
| `AddPaymentModal.tsx` | Adicionar callback `onSuccess` |
