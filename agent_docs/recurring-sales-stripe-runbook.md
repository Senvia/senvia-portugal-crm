# Vendas recorrentes e Stripe Connect — runbook

Como pôr isto a funcionar, por que ordem, e o que fazer quando corre mal.

**A ordem importa.** As edge functions falham se as tabelas não existirem, e o
webhook rejeita eventos sem o segredo configurado. Segue de cima para baixo.

---

## 1. Migrações

Correr no SQL Editor do Supabase, por esta ordem:

| Ficheiro | O que cria |
|---|---|
| `20260812120000_recurring_sales_domain.sql` | `stripe_connections`, `stripe_product_mappings`, `sale_recurrences`, `sale_recurring_cycles`, `stripe_events`, colunas novas em `sale_payments`, RLS e funções de estado |
| `20260812121000_recurring_sales_compatibility.sql` | backfill das recorrências antigas a partir de `has_recurring`, sem tocar em pagamentos |
| `20260812122000_stripe_oauth_states.sql` | `stripe_oauth_states` e o consumo atómico do state |

A segunda **não altera dinheiro histórico**: cria recorrências a partir dos
campos antigos e deixa os `sale_payments` exactamente como estão.

---

## 2. Configuração no Stripe

Painel do Stripe, em **modo de produção**:

1. **Settings → Connect → Opções de onboarding → OAuth**
   - Ligar o interruptor **"Ativar OAuth"**. Sem isto o link de autorização
     devolve erro e nenhuma organização consegue ligar-se.
   - Em **Redirecionamentos**, adicionar:
     `https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/stripe-connect`
   - Copiar o **ID de cliente de produção** (`ca_...`).

2. **Developers → Webhooks → Add endpoint**
   - Escolher **"Connected accounts"** — não o endpoint normal. O normal só
     recebe eventos da conta do Senvia; o Connect recebe de todas as contas
     ligadas e traz o `event.account` a dizer de qual.
   - URL: `https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/stripe-connected-webhook`
   - Eventos: `checkout.session.completed`, `invoice.created`,
     `invoice.finalized`, `invoice.paid`, `invoice.payment_succeeded`,
     `invoice.payment_failed`, `customer.subscription.updated`,
     `customer.subscription.deleted`
   - Copiar o **signing secret** (`whsec_...`).

O modelo de negócio tem de ser **Plataforma** ("os comerciantes recolhem
pagamentos diretamente"), não Marketplace. Em Marketplace o dinheiro passa pela
conta do Senvia e traz consigo a responsabilidade legal e fiscal de vendas que
não são nossas.

---

## 3. Secrets no Supabase

```
STRIPE_CONNECT_CLIENT_ID      = ca_...        (público, identifica a app)
STRIPE_CONNECT_WEBHOOK_SECRET = whsec_...     (secreto)
```

`STRIPE_SECRET_KEY` já existe e continua a ser usada. **O modo (test/live) é
derivado dela**, não configurado à parte: uma chave `sk_test_` só funciona com
o `ca_` de teste. Guardar o modo em separado deixava ligações antigas a dizer
"teste" enquanto cobravam dinheiro a sério.

---

## 4. Deploy das edge functions

```bash
for fn in stripe-connect stripe-product-sync stripe-sale-checkout \
          stripe-connected-webhook generate-recurring-sales \
          reconcile-connected-stripe audit-recurring-sales; do
  supabase functions deploy "$fn" --project-ref chhmfwlimtbsyjmgtokn
done
```

No Senvia o deploy é **manual** — não há automatismo.

---

## 5. Crons

| Função | Frequência | Porquê |
|---|---|---|
| `generate-recurring-sales` | diária | cria os ciclos manuais vencidos. Sem ela, uma recorrência manual chega à data de renovação e não acontece nada: nada por liquidar, ninguém cobrado |
| `reconcile-connected-stripe` | diária | recupera pagamentos cujo webhook se perdeu |

Autenticam-se no header `x-cron-secret`, contra o segredo do Vault (o mesmo
mecanismo do `reconcile-stripe-payments`). Falham fechadas.

```bash
curl -X POST "https://chhmfwlimtbsyjmgtokn.supabase.co/functions/v1/generate-recurring-sales" \
  -H "x-cron-secret: <segredo>"
```

---

## 6. Verificação ponta a ponta

1. **Ligar** — Definições → Pagamentos → Stripe → "Ligar conta Stripe". Volta
   com o crachá *Ligado* e a conta mascarada.
2. **Sincronizar** — editar um produto recorrente, activar "Sincronizar com
   Stripe". Confirmar no painel do Stripe **da conta ligada** que o Product e o
   Price existem.
3. **Cobrar** — criar uma venda recorrente com esse produto, gerar o link de
   Checkout, pagar com `4242 4242 4242 4242`.
4. **Confirmar** — a venda mostra o ciclo do mês como *Liquidado*, e o pagamento
   registado é o **bruto**, com a taxa em campo separado.

Se o passo 4 falhar, o dinheiro entrou e o CRM não soube: ver secção seguinte.

---

## 7. Quando corre mal

**Pagamento entrou no Stripe mas não aparece no CRM.**
Correr a reconciliação:
```bash
curl -X POST ".../reconcile-connected-stripe?days=30" -H "x-cron-secret: <segredo>"
```
Devolve quantas facturas recuperou. É idempotente — correr duas vezes não
duplica nada. Se não recuperar, a factura provavelmente não tem a nossa
metadata (subscrição criada fora do CRM); nesse caso fica de fora de propósito,
porque adivinhar a que venda pertence é como o dinheiro vai parar ao sítio errado.

**Ver o estado geral sem tocar em nada:**
```bash
curl ".../audit-recurring-sales" -H "x-cron-secret: <segredo>"
```
Read-only. Mostra pagamentos registados pelo líquido, ciclos vencidos por
liquidar, recorrências Stripe sem subscrição e eventos presos.

**Eventos presos em `processing` ou `failed`** — tabela `stripe_events`. Cada um
pode ser um pagamento recebido que não foi registado. O Stripe reenvia eventos
que devolveram 500; se já desistiu, a reconciliação apanha-os.

**Uma organização não consegue ligar-se.** Verificar por esta ordem: o
interruptor OAuth está ligado; o redirect URI está registado tal e qual; o
`ca_` corresponde ao modo da `STRIPE_SECRET_KEY`; quem carregou no botão é
administrador da organização.

---

## 8. Rollback

O domínio novo é aditivo — nada foi apagado. Para voltar atrás:

1. Remover o endpoint de webhook Connect no Stripe (pára a entrada de eventos).
2. Desactivar os crons.
3. As tabelas e os `sale_payments` ficam onde estão. Os campos antigos
   (`has_recurring`, `recurring_status`, `next_renewal_date`) nunca deixaram de
   ser escritos, por isso o comportamento anterior continua a funcionar.

Não apagar `stripe_connections`: perder o `acct_...` obriga cada organização a
ligar-se de novo, e as subscrições vivas ficam órfãs.

---

## Estado da implementação

Feito: domínio SQL e compatibilidade, filtros, Stripe Connect, sincronização de
produtos, Checkout ligado à venda, webhooks e liquidação pelo bruto, crons de
ciclos e reconciliação, painel por ciclo, métricas por competência/recebimento,
auditoria read-only.

Por fazer: `RecurringSaleForm` e o RPC transacional `create_sale_with_recurrence`
(a criação de venda + itens + recorrência continua a ser uma sequência de
inserts do lado do cliente), e a função de **reparação** dos dados existentes —
a auditoria mostra o que está partido, mas corrigir ainda é manual, de propósito.
