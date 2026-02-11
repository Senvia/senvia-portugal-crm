
## Remover Pagamentos do Template Telecom

### Objetivo
No nicho **telecom**, a empresa nao fatura diretamente pelo Senvia -- portanto, toda a secao de pagamentos deve ser ocultada tanto na criacao como nos detalhes da venda.

### Alteracoes

**1. `src/components/sales/CreateSaleModal.tsx`**

- Envolver a secao "Pagamentos" (Section 3.5, linhas ~1084-1180) com a condicao `{!isTelecom && (...)}`
- Isto oculta:
  - O botao "Adicionar Pagamento"
  - A lista de draft payments
  - O resumo de pagamentos (barra de progresso)
- O modal do `AddDraftPaymentModal` tambem pode ser condicionado para nao abrir em telecom (seguranca extra)

**2. `src/components/sales/SaleDetailsModal.tsx`**

- Envolver a secao "8. Payments Section" (`SalePaymentsList`) com `{!isTelecom && (...)}`
- Isto oculta:
  - A lista de pagamentos registados
  - Os botoes de adicionar pagamento, emitir fatura, etc.
- Manter a secao de Recorrencia visivel (se aplicavel) -- ou tambem ocultar se nao se aplica a telecom

**3. `src/components/sales/CreateSaleModal.tsx` (payload)**

- No `handleSubmit`, quando `isTelecom`, nao criar draft payments na base de dados (skip do loop que insere pagamentos)
- Nao enviar `payment_status` calculado -- deixar o default (`pending`) ou simplesmente ignorar

### Resumo das condicoes

| Componente | Secao | Telecom | Outros nichos |
|------------|-------|---------|---------------|
| CreateSaleModal | Pagamentos (UI) | Oculto | Visivel |
| CreateSaleModal | Draft payments (submit) | Ignorado | Processado |
| SaleDetailsModal | SalePaymentsList | Oculto | Visivel |

### Ficheiros a editar
- `src/components/sales/CreateSaleModal.tsx`
- `src/components/sales/SaleDetailsModal.tsx`

### Secao Tecnica

**CreateSaleModal - UI:**
```tsx
{!isTelecom && (
  <>
    <Separator />
    {/* Section 3.5: Payments */}
    <div className="space-y-4">
      ...toda a secao de pagamentos...
    </div>
  </>
)}
```

**CreateSaleModal - Submit:**
```tsx
// Apenas criar pagamentos se nao for telecom
if (!isTelecom && draftPayments.length > 0) {
  for (const dp of draftPayments) {
    await createPayment.mutateAsync({ ... });
  }
}
```

**SaleDetailsModal:**
```tsx
{!isTelecom && organization && (
  <SalePaymentsList ... />
)}
```
