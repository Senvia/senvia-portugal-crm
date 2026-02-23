

# Corrigir Lógica de Listas: Trial vs Plano Pago

## Problema

A Construpao está simultaneamente em "Clientes em Trial" e "Plano Elite", mas ainda está em período de teste (trial até 09/03/2026). Clientes em trial **nao devem** aparecer na lista do plano -- apenas em "Clientes em Trial".

A lista do plano (Starter/Pro/Elite) so deve ser preenchida quando o cliente **paga efetivamente via Stripe**.

## Dados Atuais

| Organização | Plano (DB) | Trial | billing_exempt | Listas Atuais |
|---|---|---|---|---|
| Perfect2Gether | elite | Sem trial | Sim (isento) | Plano Elite |
| Construpao | elite | Até 09/03 | Nao | Plano Elite + Clientes em Trial |

## Correção

### 1. Remover Construpao da lista "Plano Elite" (SQL direto)

Remover o registo da tabela `marketing_list_members` que liga a Construpao à lista "Plano Elite". A Construpao deve ficar **apenas** em "Clientes em Trial" até pagar.

### 2. Validar lógica do webhook Stripe

O webhook (`stripe-webhook/index.ts`) ja funciona corretamente:
- So adiciona à lista do plano no evento `checkout.session.completed` (pagamento real)
- Remove de "Clientes em Trial" quando o pagamento e confirmado

Nenhuma alteração necessária no webhook.

### 3. Nota sobre Perfect2Gether

A Perfect2Gether esta corretamente em "Plano Elite" porque tem `billing_exempt = true` (isenta de faturação) e nao esta em trial. A presença na lista e legitima.

## Ficheiros Alterados

1. **SQL direto (dados)** -- Remover Construpao da lista "Plano Elite"

## Resultado

- Construpao: apenas em "Clientes em Trial"
- Perfect2Gether: mantém-se em "Plano Elite" (isenta, sem trial)
- Futuras organizações em trial: so entram na lista do plano apos pagamento Stripe
