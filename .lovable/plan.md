
# Corrigir Labels das Integracoes nos Planos

## Problema
Na lista de integracoes do plano Elite, os textos estao incorretos:
- "Faturacao (InvoiceXpress)" -- deveria ser "Faturacao (KeyInvoice, InvoiceXpress)"
- "Stripe (Pagamentos)" -- deveria ser "Pagamentos (Stripe)"

## Alteracoes

### 1. `src/lib/stripe-plans.ts`
- Linha 72: Alterar o array de integracoes do plano Elite:
  - `"Faturação (InvoiceXpress)"` -> `"Faturação (KeyInvoice, InvoiceXpress)"`
  - `"Stripe (Pagamentos)"` -> `"Pagamentos (Stripe)"`

### 2. `src/components/settings/BillingTab.tsx`
- Atualizar o mapeamento de icones (`INTEGRATION_ICONS`) para refletir as novas chaves:
  - Remover `'Faturação (InvoiceXpress)'` e `'Stripe (Pagamentos)'`
  - Adicionar `'Faturação (KeyInvoice, InvoiceXpress)'` com icone FileText
  - Adicionar `'Pagamentos (Stripe)'` com icone CreditCard
