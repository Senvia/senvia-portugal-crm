## Objetivo

Anular (void) a fatura aberta `in_1TRyKNLWnA81DzXTci2JNxMI` (€49) no Stripe, que ficou pendente da subscrição antiga já cancelada do cliente Escolha Inteligente. Sem isto, a fatura continua a constar como dívida no perfil Stripe do cliente e ele pode receber e-mails de cobrança do Stripe.

## Estado actual confirmado

- Subscrição antiga `sub_1TH5za...` → **canceled** ✅
- Subscrição nova `sub_1TS03U...` → **active**, paga ✅
- `payment_failed_at` da org → **NULL** (limpo) ✅
- Fatura `in_1TS035...` (nova sub) → **paid** ✅
- Fatura `in_1TH5zK...` (sub antiga, primeira) → **paid** ✅
- Fatura `in_1TRyKN...` (sub antiga, ciclo 2) → **open** ⚠️ ← problema único restante

## Plano (1 chamada à API Stripe)

Executar o endpoint nativo `POST /v1/invoices/{id}/void` para a fatura `in_1TRyKNLWnA81DzXTci2JNxMI` via uma edge function temporária (`void-stripe-invoice`) ou usando o `stripe_api_execute` com a operação correcta.

Passos:
1. Criar edge function efémera `void-stripe-invoice` que recebe `invoice_id` e chama `POST /v1/invoices/{id}/void` com a `STRIPE_SECRET_KEY` já existente.
2. Invocá-la para a fatura `in_1TRyKNLWnA81DzXTci2JNxMI`.
3. Verificar via `list_invoices` que o status passou a `void`.
4. Apagar a edge function (não é para uso recorrente).

## Verificação final

- Listar invoices do cliente → confirmar que `in_1TRyKN...` tem `status: void`.
- Confirmar que `payment_failed_at` da org continua NULL.
- Daniel: nenhum ecrã de pagamento em atraso, nenhuma cobrança nova, fatura órfã anulada.

## Alternativa manual (se preferires)

Tu podes fazer no painel Stripe em 10 segundos:
- Abrir a fatura `in_1TRyKNLWnA81DzXTci2JNxMI`
- Clicar em "More" → "Void invoice"

Diz qual preferes que faça.
