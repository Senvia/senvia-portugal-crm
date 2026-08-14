import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { rateLimit } from "../_shared/security.ts";

const SENVIA_AGENCY_ORG_ID = "06fe9e1d-9670-45b0-8717-c5a6e90be380";

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_U0wAc7Tuy8w6gA": "starter",
  "prod_U0wGoA4odOBHOZ": "pro",
  "prod_U0wG6doz0zgZFV": "elite",
};

const PLAN_LIST_NAMES: Record<string, string> = {
  starter: "Plano Starter",
  pro: "Plano Pro",
  elite: "Plano Elite",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

// Failures in the money path must be greppable and must trip log-level alerts —
// logStep is console.log, which alerting filters ignore.
const logError = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.error(`[STRIPE-WEBHOOK] ERROR ${step}${d}`);
};

// --- Stripe API-version shims -------------------------------------------------
// The event body arrives in whatever API version the webhook ENDPOINT is
// configured with in the Stripe Dashboard — constructEventAsync only verifies
// the signature, it does not re-render the payload to the SDK's pinned version.
// The Basil versions (2025-06-30 onward) moved these fields, so every read must
// accept both shapes or it silently yields undefined.

/** Basil moved Invoice.subscription → Invoice.parent.subscription_details.subscription. */
function invoiceSubscriptionId(inv: any): string | null {
  const idOf = (v: any): string | null => (typeof v === "string" ? v : v?.id) || null;
  return idOf(inv?.subscription) ?? idOf(inv?.parent?.subscription_details?.subscription);
}

/** Basil moved Subscription.current_period_end → items.data[].current_period_end. */
function subPeriodEnd(sub: any): number | null {
  return sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end ?? null;
}

/** Basil removed Invoice.charge / Invoice.payment_intent in favour of Invoice.payments. */
function invoicePaymentIds(inv: any): { chargeId: string | null; piId: string | null } {
  const idOf = (v: any): string | null => (typeof v === "string" ? v : v?.id) || null;
  const chargeId = idOf(inv?.charge);
  let piId = idOf(inv?.payment_intent);
  if (!chargeId && !piId && inv?.payments?.data?.length) {
    piId = idOf(inv.payments.data[0]?.payment?.payment_intent);
  }
  return { chargeId, piId };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Rate limit: 30 req/min per IP (Stripe never bursts that hard).
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`stripe-webhook:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return new Response("Too many requests", { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetAfterMs / 1000)) } });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response("Server config error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: (err as Error).message });
    return new Response("Invalid signature", { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const email = session.customer_email || session.customer_details?.email;
        if (!email) { logStep("No email in checkout session"); break; }
        const subId = session.subscription as string;
        const sub = await stripe.subscriptions.retrieve(subId);
        const productId = sub.items.data[0].price.product as string;
        const plan = PRODUCT_TO_PLAN[productId];

        const orgId = await findOrgByEmail(supabase, email);
        let isReactivation = false;
        if (orgId) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("plan, payment_failed_at")
            .eq("id", orgId)
            .maybeSingle();
          isReactivation = !!(orgData?.plan || orgData?.payment_failed_at);
        }

        if (plan) await updateOrgPlan(supabase, email, plan);
        await clearPaymentFailed(supabase, email);
        await markFirstPaid(supabase, email);
        await setCurrentPeriodEnd(supabase, email, subPeriodEnd(sub));
        await clearTempBillingExempt(supabase, email);

        const orgName = await getOrgNameByEmail(supabase, email);

        if (isReactivation) {
          await dispatchAutomation(supabase, "stripe_subscription_created", { email, plan: plan || "unknown", nome: orgName });
        }
        if (plan) {
          await dispatchAutomation(supabase, `stripe_welcome_${plan}`, { email, plan, nome: orgName });
        }

        await syncStripeAutoLists(supabase, email, orgName, "checkout_completed", plan || null, isReactivation);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const productId = sub.items.data[0].price.product as string;
        const plan = PRODUCT_TO_PLAN[productId];
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;

        if (plan && email) await updateOrgPlan(supabase, email, plan);

        if (email) {
          const orgName = await getOrgNameByEmail(supabase, email);

          if (sub.status === "past_due") {
            await recordPaymentFailed(supabase, email);
            await dispatchAutomation(supabase, "stripe_subscription_past_due", { email, plan: plan || "unknown", nome: orgName });
            await syncStripeAutoLists(supabase, email, orgName, "past_due", plan || null);
          }
          if (sub.status === "active") {
            await clearPaymentFailed(supabase, email);
            await markFirstPaid(supabase, email);
            await setCurrentPeriodEnd(supabase, email, subPeriodEnd(sub));
            await clearTempBillingExempt(supabase, email);
            await dispatchAutomation(supabase, "stripe_subscription_renewed", { email, plan: plan || "unknown", nome: orgName });
            await syncStripeAutoLists(supabase, email, orgName, "renewed", plan || null);

            // Sync recurring_value when subscription items change (e.g., seat add/remove)
            if (plan) {
              const clientOrgId = await findOrgByEmail(supabase, email);
              if (clientOrgId) {
                const recurringTotal = sub.items.data.reduce((sum: number, item: any) => {
                  if (item.price?.recurring && item.price.unit_amount != null) {
                    return sum + (item.price.unit_amount / 100) * (item.quantity || 1);
                  }
                  return sum;
                }, 0);
                if (recurringTotal > 0) {
                  const { error: syncErr } = await supabase
                    .from("sales")
                    .update({ recurring_value: recurringTotal })
                    .eq("client_org_id", clientOrgId)
                    .eq("recurring_status", "active")
                    .eq("organization_id", SENVIA_AGENCY_ORG_ID);
                  if (syncErr) {
                    logStep("subscription.updated: recurring_value sync error", { error: syncErr.message });
                  } else {
                    logStep("subscription.updated: recurring_value synced", { clientOrgId, recurringTotal });
                  }
                }
              }
            }
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const productId = sub.items?.data?.[0]?.price?.product as string | undefined;
        const plan = productId ? PRODUCT_TO_PLAN[productId] : undefined;
        const customerId = sub.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;
        // A deleted Stripe customer carries no email. Without one we cannot find
        // the org, so its plan would silently stay active forever — make that
        // loud instead of dropping the event.
        if (!email) {
          logError("subscription.deleted: no email on customer — org plan NOT cleared", {
            customerId, subscription: sub.id,
          });
        }
        if (email) {
          await updateOrgPlan(supabase, email, null);
          await clearPaymentFailed(supabase, email);
          const orgName = await getOrgNameByEmail(supabase, email);
          await dispatchAutomation(supabase, "stripe_subscription_canceled", { email, plan: plan || "unknown", nome: orgName });
          await syncStripeAutoLists(supabase, email, orgName, "canceled", plan || null);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email;
        logStep("Payment failed", { customer: invoice.customer, email });
        if (email) {
          await recordPaymentFailed(supabase, email);
          const orgName = await getOrgNameByEmail(supabase, email);
          await dispatchAutomation(supabase, "stripe_payment_failed", { email, plan: "unknown", nome: orgName });
          await syncStripeAutoLists(supabase, email, orgName, "payment_failed", null);
        }
        break;
      }
      case "invoice.paid": {
        await handleInvoicePaid(supabase, stripe, event.data.object as Stripe.Invoice);
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    logStep("Processing error", { error: (err as Error).message });
    return new Response("Processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

// --- Invoice Paid → Recurring Commission + Sale Update ---

// Throws on failure. The caller returns 500 so Stripe retries the delivery —
// previously every error here was swallowed and the webhook answered 200, which
// told Stripe the payment had been processed and permanently dropped it.
async function handleInvoicePaid(supabase: any, stripe: Stripe, invoice: Stripe.Invoice) {
  {
    let email = invoice.customer_email;
    // customer_email can be absent; fall back to the customer object rather than
    // dropping the payment.
    if (!email && invoice.customer) {
      try {
        const cust = await stripe.customers.retrieve(invoice.customer as string);
        if (!(cust as any).deleted) email = (cust as Stripe.Customer).email ?? null;
      } catch (e) {
        logError("invoice.paid: customer lookup failed", { error: (e as Error).message });
      }
    }
    if (!email) {
      logError("invoice.paid: no email — cannot link payment to an organization", { invoice: invoice.id });
      return;
    }

    const amount = (invoice.amount_paid || 0) / 100;
    if (amount <= 0) { logStep("invoice.paid: zero amount"); return; }

    // At-least-once delivery: Stripe redelivers on timeout/5xx. Without this the
    // same invoice inserts a second sale_payments row — double-recorded revenue.
    // The unique index on sale_payments.stripe_invoice_id is the hard guarantee;
    // this check just avoids the noisy conflict on the common path.
    const { data: alreadyPaid } = await supabase
      .from("sale_payments")
      .select("id")
      .eq("stripe_invoice_id", invoice.id)
      .limit(1);
    if (alreadyPaid && alreadyPaid.length > 0) {
      logStep("invoice.paid: already recorded — skipping", { invoice: invoice.id });
      return;
    }

    // Determine plan + compute real recurring total from subscription items
    let plan: string | null = null;
    let recurringTotal = 0;
    let subscriptionRenewalDate: string | null = null;
    // Itens da subscrição (preço + quantidade). Guardados fora do try porque a
    // criação automática da venda, mais abaixo, converte-os em sale_items via
    // stripe_product_mappings.
    let subItems: Array<{ priceId: string; quantity: number; unitAmount: number }> = [];
    const subId = invoiceSubscriptionId(invoice);
    if (!subId) {
      // One-off invoices legitimately have no subscription, but on a renewal it
      // means the payload shape changed again — plan, recurring value and the
      // renewal date all degrade silently, so say so loudly.
      logStep("invoice.paid: no subscription on invoice — plan/renewal data incomplete", { invoice: invoice.id });
    }
    if (subId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        const productId = sub.items.data[0]?.price?.product as string;
        plan = PRODUCT_TO_PLAN[productId] || null;
        if (!plan) logError("invoice.paid: unknown Stripe product, plan not mapped", { productId, invoice: invoice.id });

        recurringTotal = sub.items.data.reduce((sum: number, item: any) => {
          if (item.price?.recurring && item.price.unit_amount != null) {
            return sum + (item.price.unit_amount / 100) * (item.quantity || 1);
          }
          return sum;
        }, 0);

        subItems = sub.items.data
          .filter((item: any) => item.price?.id && item.price.unit_amount != null)
          .map((item: any) => ({
            priceId: item.price.id,
            quantity: item.quantity || 1,
            unitAmount: item.price.unit_amount / 100,
          }));

        const periodEndUnix = subPeriodEnd(sub);
        await setCurrentPeriodEnd(supabase, email, periodEndUnix);
        if (periodEndUnix) {
          subscriptionRenewalDate = new Date(periodEndUnix * 1000).toISOString().split("T")[0];
        }
      } catch (e) {
        logError("invoice.paid: failed to fetch sub details", { error: (e as Error).message });
      }
    }

    // Find the client organization by email
    const clientOrgId = await findOrgByEmail(supabase, email);
    if (!clientOrgId) { logStep("invoice.paid: no org found for email", { email }); return; }

    await markFirstPaid(supabase, email);
    await clearTempBillingExempt(supabase, email);

    // Compute payment date + period end
    const paidAtUnix = invoice.status_transitions?.paid_at ?? invoice.created;
    const paymentDate = paidAtUnix
      ? new Date(paidAtUnix * 1000).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    const periodEnd = invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString().split("T")[0]
      : null;
    // Stripe bills in advance: this invoice is dated `paymentDate` but pays for
    // the cycle running periodStart→periodEnd. Recorded on the payment itself so
    // the UI can show "covers September" instead of only the charge date — the
    // two frequently land in different calendar months (a renewal on the 30th
    // pays for the month starting that day), which reads as a missing payment
    // when someone filters Finance by the month the subscription is FOR.
    const periodStart = invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString().split("T")[0]
      : null;

    // Find sale in Senvia org linked to this client org
    // `pending` is included: a subscription can be paid before anyone moves the
    // sale out of pending, and excluding it dropped the payment silently (the
    // pending → in_progress promotion below was unreachable). Ordering is
    // explicit so a client org with several sales always resolves to the same
    // one instead of an arbitrary row that can change between runs.
    const { data: sales, error: salesErr } = await supabase
      .from("sales")
      .select("id, created_by, total_value, has_recurring, status")
      .eq("organization_id", SENVIA_AGENCY_ORG_ID)
      .eq("client_org_id", clientOrgId)
      .in("status", ["pending", "in_progress", "fulfilled", "delivered"])
      .order("created_at", { ascending: true })
      .limit(1);

    let sale: any = null;
    if (salesErr) {
      logError("invoice.paid: sales query error", { error: salesErr.message });
      throw new Error(`sales query failed: ${salesErr.message}`);
    } else if (!sales || sales.length === 0) {
      // Não havia venda ligada — até aqui o pagamento era simplesmente deitado
      // fora, com um erro no log que ninguém lia, e alguém tinha de criar a
      // venda à mão pelo "Venda de Plano Senvia". Um assinante que paga É um
      // cliente com uma venda: cria-se cliente e venda aqui, no primeiro
      // pagamento, e o resto do fluxo segue como se sempre tivessem existido.
      try {
        const { data: clientOrg } = await supabase
          .from("organizations")
          .select("name, contact_phone")
          .eq("id", clientOrgId)
          .maybeSingle();

        // Cliente na agência: reaproveita por email (a mesma pessoa pode já lá
        // estar como cliente doutro serviço), nunca por nome.
        const { data: existingClient } = await supabase
          .from("crm_clients")
          .select("id")
          .eq("organization_id", SENVIA_AGENCY_ORG_ID)
          .eq("email", email)
          .maybeSingle();

        let clientId = existingClient?.id ?? null;
        if (!clientId) {
          const { data: createdClient, error: clientErr } = await supabase
            .from("crm_clients")
            .insert({
              organization_id: SENVIA_AGENCY_ORG_ID,
              name: clientOrg?.name || email,
              email,
              phone: clientOrg?.contact_phone ?? null,
              notes: "Criado automaticamente no primeiro pagamento da subscrição Senvia OS.",
            })
            .select("id")
            .maybeSingle();
          if (clientErr) throw new Error(`client insert failed: ${clientErr.message}`);
          clientId = createdClient?.id ?? null;
        }

        const { data: createdSale, error: saleErr } = await supabase
          .from("sales")
          .insert({
            organization_id: SENVIA_AGENCY_ORG_ID,
            client_id: clientId,
            client_org_id: clientOrgId,
            status: "in_progress",
            has_recurring: true,
            recurring_value: recurringTotal > 0 ? recurringTotal : amount,
            total_value: recurringTotal > 0 ? recurringTotal : amount,
            notes: `Venda criada automaticamente no primeiro pagamento (${invoice.id}).`,
          })
          .select("id, created_by, total_value, has_recurring, status")
          .maybeSingle();
        if (saleErr) throw new Error(`sale insert failed: ${saleErr.message}`);
        sale = createdSale;

        // Itens da venda a partir dos itens da subscrição, via o catálogo
        // sincronizado. Um preço sem mapeamento não inventa produto nenhum —
        // fica só no total.
        if (sale && subItems.length > 0) {
          const { data: mappings } = await supabase
            .from("stripe_product_mappings")
            .select("product_id, stripe_price_id")
            .eq("organization_id", SENVIA_AGENCY_ORG_ID)
            .in("stripe_price_id", subItems.map((i) => i.priceId));
          const productByPrice = new Map(
            (mappings ?? []).map((m: any) => [m.stripe_price_id, m.product_id]),
          );
          const items = subItems
            .filter((i) => productByPrice.has(i.priceId))
            .map((i) => ({
              organization_id: SENVIA_AGENCY_ORG_ID,
              sale_id: sale.id,
              product_id: productByPrice.get(i.priceId),
              quantity: i.quantity,
              unit_price: i.unitAmount,
            }));
          if (items.length > 0) {
            const { error: itemsErr } = await supabase.from("sale_items").insert(items);
            if (itemsErr) logError("invoice.paid: sale_items insert failed", { error: itemsErr.message });
          }
        }

        logStep("invoice.paid: client and sale auto-created", { clientOrgId, saleId: sale?.id, clientId });
      } catch (e) {
        // Se a criação falhar, mantém-se o comportamento antigo (log e nada
        // registado) — mas agora o Stripe repete a entrega, porque lançamos.
        logError("invoice.paid: auto-create failed", { error: (e as Error).message, clientOrgId });
        throw e;
      }
    } else {
      sale = sales[0];
    }
    if (sale) {
      // Update sale immediately — always, even if no salesperson assigned.
      // This guarantees recurring_status flips to 'active' and next_renewal_date
      // is set before any commission/payment logic that could fail.
      const updatePayload: Record<string, any> = {
        recurring_status: "active",
        next_renewal_date: subscriptionRenewalDate || periodEnd,
        last_renewal_date: paymentDate,
      };
      if (recurringTotal > 0) updatePayload.recurring_value = recurringTotal;
      if (sale.status === "pending") updatePayload.status = "in_progress";

      const { error: saleUpdateErr } = await supabase
        .from("sales")
        .update(updatePayload)
        .eq("id", sale.id);

      if (saleUpdateErr) {
        logError("invoice.paid: sale update error", { error: saleUpdateErr.message });
      } else {
        logStep("invoice.paid: sale updated to active", { saleId: sale.id, recurringTotal, plan });
      }
    }

    // --- Commission record (only if sale + salesperson exist) ---
    if (sale?.created_by) {
      const stripeInvoiceId = invoice.id;

      const { data: existing } = await supabase
        .from("stripe_commission_records")
        .select("id")
        .eq("stripe_invoice_id", stripeInvoiceId)
        .limit(1);

      if (existing && existing.length > 0) {
        logStep("invoice.paid: commission already recorded — skipping", { stripeInvoiceId });
      } else {
        const salesSettings = await getOrgSalesSettings(supabase);
        const globalRate = salesSettings?.commission_percentage || 0;

        const { data: member } = await supabase
          .from("organization_members")
          .select("commission_rate")
          .eq("organization_id", SENVIA_AGENCY_ORG_ID)
          .eq("user_id", sale.created_by)
          .eq("is_active", true)
          .maybeSingle();

        const rate = globalRate > 0 ? globalRate : Number(member?.commission_rate || 0);

        if (rate > 0) {
          const commissionAmount = amount * (rate / 100);
          const { error: insertErr } = await supabase
            .from("stripe_commission_records")
            .insert({
              organization_id: SENVIA_AGENCY_ORG_ID,
              sale_id: sale.id,
              user_id: sale.created_by,
              client_org_id: clientOrgId,
              amount,
              commission_rate: rate,
              commission_amount: commissionAmount,
              stripe_invoice_id: stripeInvoiceId,
              period_start: periodStart,
              period_end: periodEnd,
              plan,
              status: "pending",
            });

          if (insertErr) {
            logError("invoice.paid: commission insert error", { error: insertErr.message });
          } else {
            logStep("invoice.paid: commission recorded", {
              userId: sale.created_by, amount, rate, commissionAmount, plan
            });
          }
        } else {
          logStep("invoice.paid: no commission rate, skipping commission record", { userId: sale.created_by });
        }
      }
    } else if (sale) {
      logStep("invoice.paid: sale has no created_by, skipping commission", { saleId: sale.id });
    }

    // --- Payment record (only if sale found) ---
    if (!sale) {
      logStep("invoice.paid: no sale linked, skipping payment record");
      return;
    }

    const BILLING_FEE_RATE = 0.007;
    const round2 = (n: number) => Math.round(n * 100) / 100;
    let netAmount = amount;
    let stripeFee = 0;
    try {
      const inv = invoice as any;
      let { chargeId, piId } = invoicePaymentIds(inv);
      if (!chargeId && !piId) {
        // `payments` is an expandable sub-list that Stripe does NOT include in
        // the webhook event body, and Basil removed the old charge /
        // payment_intent fields. Without this refetch the fee is unknown and
        // every payment gets recorded at GROSS, overstating cash received.
        const full: any = await stripe.invoices.retrieve(inv.id, { expand: ["payments"] });
        ({ chargeId, piId } = invoicePaymentIds(full));
      }
      let charge: any = null;
      if (chargeId) {
        charge = await stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
      } else if (piId) {
        const pi: any = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge.balance_transaction"] });
        charge = pi.latest_charge;
      }
      let bt: any = charge && typeof charge !== "string" ? charge.balance_transaction : null;
      if (typeof bt === "string") bt = await stripe.balanceTransactions.retrieve(bt);
      if (bt) {
        const cardFee = (bt.fee || 0) / 100;
        const billingFee = round2(amount * BILLING_FEE_RATE);
        stripeFee = round2(cardFee + billingFee);
        netAmount = round2(amount - stripeFee);
      } else {
        logError("invoice.paid: net unavailable, recording GROSS amount", { invoice: inv.id });
      }
    } catch (e) {
      logError("invoice.paid: could not fetch balance_transaction, recording GROSS", { error: (e as Error).message });
    }

    // ── Domínio recorrente: recorrência + ciclo desta competência ────────────
    // Garante a recorrência da venda e liquida o ciclo deste período. Uma
    // recorrência migrada como 'manual' é promovida a Stripe na primeira
    // fatura que chegar — é a subscrição real a reclamar a venda dela.
    let cycleId: string | null = null;
    try {
      const { data: recurrences } = await supabase
        .from("sale_recurrences")
        .select("id, billing_provider, stripe_subscription_id")
        .eq("sale_id", sale.id)
        .in("service_status", ["pending", "active", "paused"])
        .order("created_at", { ascending: false })
        .limit(1);

      let recurrence = recurrences?.[0] ?? null;
      if (!recurrence) {
        const { data: createdRec } = await supabase
          .from("sale_recurrences")
          .insert({
            organization_id: SENVIA_AGENCY_ORG_ID,
            sale_id: sale.id,
            amount: recurringTotal > 0 ? recurringTotal : amount,
            anchor_date: periodStart || paymentDate,
            service_status: "active",
            billing_status: "current",
            billing_provider: "stripe",
            next_cycle_date: subscriptionRenewalDate || periodEnd,
            stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : null,
            stripe_subscription_id: subId ?? null,
          })
          .select("id, billing_provider, stripe_subscription_id")
          .maybeSingle();
        recurrence = createdRec ?? null;
      } else if (!recurrence.stripe_subscription_id && subId) {
        await supabase
          .from("sale_recurrences")
          .update({
            billing_provider: "stripe",
            stripe_subscription_id: subId,
            stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : null,
            billing_status: "current",
            next_cycle_date: subscriptionRenewalDate || periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", recurrence.id);
      }

      if (recurrence && periodStart && periodEnd) {
        // O due_date tem de caber dentro do período (constraint da tabela).
        const due = paymentDate < periodStart ? periodStart : paymentDate > periodEnd ? periodEnd : paymentDate;
        // Procura por vizinhança, não por igualdade exacta: o ciclo que o cron
        // cria (30/ago–29/set) e o período da fatura Stripe (30/ago–30/set)
        // diferem tipicamente um dia, e a igualdade exacta criava um segundo
        // ciclo para a mesma competência — um pago e um pendente para sempre.
        const windowStart = new Date(new Date(periodStart).getTime() - 15 * 86_400_000)
          .toISOString().slice(0, 10);
        const windowEnd = new Date(new Date(periodStart).getTime() + 15 * 86_400_000)
          .toISOString().slice(0, 10);
        const { data: nearCycles } = await supabase
          .from("sale_recurring_cycles")
          .select("id")
          .eq("recurrence_id", recurrence.id)
          .gte("period_start", windowStart)
          .lte("period_start", windowEnd)
          .order("period_start", { ascending: true })
          .limit(1);
        const existingCycle = nearCycles?.[0] ?? null;

        if (existingCycle) {
          cycleId = existingCycle.id;
        } else {
          const { data: createdCycle } = await supabase
            .from("sale_recurring_cycles")
            .insert({
              recurrence_id: recurrence.id,
              sale_id: sale.id,
              organization_id: SENVIA_AGENCY_ORG_ID,
              period_start: periodStart,
              period_end: periodEnd,
              due_date: due,
              amount,
              currency: "EUR",
              status: "pending",
              stripe_invoice_id: invoice.id,
            })
            .select("id")
            .maybeSingle();
          cycleId = createdCycle?.id ?? null;
        }
        if (cycleId) {
          await supabase
            .from("sale_recurring_cycles")
            .update({ status: "paid", paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", cycleId);
        }
      }
    } catch (e) {
      // O registo do pagamento não pode falhar por causa do domínio novo.
      logError("invoice.paid: recurrence/cycle bookkeeping failed", { error: (e as Error).message });
    }

    const stripeInvoiceId = invoice.id;
    const planLabel = plan ? PLAN_LIST_NAMES[plan] || plan : "subscription";
    const feeNote = stripeFee > 0 ? ` · bruto ${amount.toFixed(2)}€, taxa ${stripeFee.toFixed(2)}€` : "";
    const { error: paymentErr } = await supabase
      .from("sale_payments")
      .insert({
        organization_id: SENVIA_AGENCY_ORG_ID,
        sale_id: sale.id,
        // O BRUTO é o que o cliente pagou e o que abate à dívida da venda.
        // Registar o líquido (como era) deixava cada venda com o valor da taxa
        // por liquidar para sempre — a venda 0009 mostrava 203,23€ pagos em vez
        // de 206€. A taxa é custo nosso e vive nos campos próprios ao lado.
        amount,
        payment_date: paymentDate,
        status: "paid",
        payment_method: "card",
        stripe_invoice_id: stripeInvoiceId,
        stripe_gross_amount: amount,
        stripe_fee_amount: stripeFee,
        stripe_net_amount: netAmount,
        recurring_cycle_id: cycleId,
        billing_period_start: periodStart,
        billing_period_end: periodEnd,
        notes: `Stripe ${planLabel} · ${stripeInvoiceId}${feeNote}`,
      });

    if (paymentErr) {
      // 23505 = unique violation on stripe_invoice_id: a concurrent redelivery
      // (or the daily reconciler) already recorded this invoice. That is the
      // guard doing its job, not a failure — do not make Stripe retry.
      if ((paymentErr as any).code === "23505") {
        logStep("invoice.paid: payment already recorded by a concurrent run", { invoice: stripeInvoiceId });
        return;
      }
      logError("invoice.paid: payment insert error", { error: paymentErr.message });
      throw new Error(`payment insert failed: ${paymentErr.message}`);
    }
    logStep("invoice.paid: payment recorded in sale_payments", { saleId: sale.id, amount, netAmount });
  }
}

async function getOrgSalesSettings(supabase: any) {
  const { data } = await supabase
    .from("organizations")
    .select("sales_settings")
    .eq("id", SENVIA_AGENCY_ORG_ID)
    .maybeSingle();
  return data?.sales_settings || {};
}

// --- Stripe Auto-Lists Sync ---

type ListEventType = "checkout_completed" | "renewed" | "past_due" | "payment_failed" | "canceled";

async function syncStripeAutoLists(
  supabase: any,
  email: string,
  name: string,
  eventType: ListEventType,
  plan: string | null,
  isReactivation: boolean = false
) {
  try {
    logStep("Syncing Stripe auto-lists", { email, eventType, plan });

    await supabase.rpc("ensure_stripe_auto_lists", { p_org_id: SENVIA_AGENCY_ORG_ID });

    const { data: contact, error: contactErr } = await supabase
      .from("marketing_contacts")
      .upsert(
        { organization_id: SENVIA_AGENCY_ORG_ID, email, name: name || email, source: "stripe", subscribed: true },
        { onConflict: "organization_id,email" }
      )
      .select("id")
      .single();

    if (contactErr || !contact) {
      logStep("Failed to upsert marketing contact", { error: contactErr?.message });
      return;
    }
    const contactId = contact.id;

    const { data: lists } = await supabase
      .from("client_lists")
      .select("id, name")
      .eq("organization_id", SENVIA_AGENCY_ORG_ID)
      .eq("is_system", true)
      .in("name", ["Plano Starter", "Plano Pro", "Plano Elite", "Pagamento em Atraso", "Subscrição Cancelada", "Clientes em Trial", "Trial Expirado", "Subscrição Reativada"]);

    if (!lists || lists.length === 0) {
      logStep("No Stripe auto-lists found");
      return;
    }

    const listMap: Record<string, string> = {};
    for (const l of lists) listMap[l.name] = l.id;

    const planListIds = [listMap["Plano Starter"], listMap["Plano Pro"], listMap["Plano Elite"]].filter(Boolean);
    const overdueListId = listMap["Pagamento em Atraso"];
    const canceledListId = listMap["Subscrição Cancelada"];
    const trialListId = listMap["Clientes em Trial"];
    const trialExpiredListId = listMap["Trial Expirado"];
    const reactivatedListId = listMap["Subscrição Reativada"];
    const currentPlanListId = plan ? listMap[PLAN_LIST_NAMES[plan]] : null;

    const addToList = async (listId: string) => {
      if (!listId) return;
      await supabase.from("marketing_list_members").upsert(
        { list_id: listId, contact_id: contactId },
        { onConflict: "list_id,contact_id" }
      );
    };

    const removeFromList = async (listId: string) => {
      if (!listId) return;
      await supabase.from("marketing_list_members")
        .delete()
        .eq("list_id", listId)
        .eq("contact_id", contactId);
    };

    const removeFromLists = async (listIds: string[]) => {
      for (const id of listIds) await removeFromList(id);
    };

    switch (eventType) {
      case "checkout_completed":
      case "renewed":
        if (currentPlanListId) await addToList(currentPlanListId);
        for (const id of planListIds) {
          if (id !== currentPlanListId) await removeFromList(id);
        }
        if (overdueListId) await removeFromList(overdueListId);
        if (canceledListId) await removeFromList(canceledListId);
        if (trialListId) await removeFromList(trialListId);
        if (trialExpiredListId) await removeFromList(trialExpiredListId);
        if (isReactivation && reactivatedListId) await addToList(reactivatedListId);
        break;

      case "past_due":
      case "payment_failed":
        if (overdueListId) await addToList(overdueListId);
        break;

      case "canceled":
        await removeFromLists(planListIds);
        if (overdueListId) await removeFromList(overdueListId);
        if (reactivatedListId) await removeFromList(reactivatedListId);
        if (canceledListId) await addToList(canceledListId);
        break;
    }

    logStep("Auto-lists synced successfully", { eventType, plan });
  } catch (err) {
    logStep("Auto-lists sync failed", { error: (err as Error).message });
  }
}

// --- Helper functions ---

async function dispatchAutomation(supabase: any, triggerType: string, record: Record<string, string>) {
  try {
    logStep("Dispatching automation", { triggerType, record });
    const { error } = await supabase.functions.invoke("process-automation", {
      body: {
        trigger_type: triggerType,
        organization_id: SENVIA_AGENCY_ORG_ID,
        record,
      },
    });
    if (error) logStep("Automation dispatch error", { error: error.message });
    else logStep("Automation dispatched", { triggerType });
  } catch (err) {
    logStep("Automation dispatch failed", { error: (err as Error).message });
  }
}

async function getOrgNameByEmail(supabase: any, email: string): Promise<string> {
  try {
    const orgId = await findOrgByEmail(supabase, email);
    if (!orgId) return "";
    const { data } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
    return data?.name || "";
  } catch {
    return "";
  }
}

async function findOrgByEmail(supabase: any, email: string) {
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { logStep("Error listing users", { error: listErr.message }); return null; }

  const user = users.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) { logStep("User not found", { email }); return null; }

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!member) { logStep("No org membership found", { userId: user.id }); return null; }
  return member.organization_id;
}

async function updateOrgPlan(supabase: any, email: string, plan: string | null) {
  logStep("Updating org plan", { email, plan });
  const orgId = await findOrgByEmail(supabase, email);
  if (!orgId) return;

  const { error: updateErr } = await supabase
    .from("organizations")
    .update({ plan: plan || null })
    .eq("id", orgId);

  if (updateErr) {
    logStep("Failed to update plan", { error: updateErr.message });
  } else {
    logStep("Plan updated successfully", { orgId, plan });
  }
}

async function recordPaymentFailed(supabase: any, email: string) {
  logStep("Recording payment failure", { email });
  const orgId = await findOrgByEmail(supabase, email);
  if (!orgId) return;

  const { error } = await supabase
    .from("organizations")
    .update({ payment_failed_at: new Date().toISOString() })
    .eq("id", orgId)
    .is("payment_failed_at", null);

  if (error) {
    logStep("Failed to record payment failure", { error: error.message });
  } else {
    logStep("Payment failure recorded", { orgId });
  }
}

// Marks the org as a paying customer on its first successful payment. Idempotent:
// once first_paid_at is set, it never moves — even if a future payment fails,
// the org is treated as a paying customer with an overdue renewal.
async function markFirstPaid(supabase: any, email: string) {
  const orgId = await findOrgByEmail(supabase, email);
  if (!orgId) return;
  const { error } = await supabase
    .from("organizations")
    .update({ first_paid_at: new Date().toISOString() })
    .eq("id", orgId)
    .is("first_paid_at", null);
  if (error) logStep("Failed to mark first_paid_at", { error: error.message });
  else logStep("first_paid_at marked (or already set)", { orgId });
}

// Persists the end of the current paid Stripe period — used by check-subscription
// and the protected route to know when the next renewal is due (plus 4 days of
// grace before blocking).
async function setCurrentPeriodEnd(supabase: any, email: string, periodEndUnix: number | null | undefined) {
  if (!periodEndUnix || periodEndUnix <= 0) return;
  const orgId = await findOrgByEmail(supabase, email);
  if (!orgId) return;
  const iso = new Date(periodEndUnix * 1000).toISOString();
  const { error } = await supabase
    .from("organizations")
    .update({ current_period_end: iso })
    .eq("id", orgId);
  if (error) logStep("Failed to set current_period_end", { error: error.message });
}

// When a real payer (first_paid_at set) successfully pays via Stripe, clear
// any temporary billing_exempt = true that the super admin set as a stop-gap
// (typical case: customer was late paying, we toggled exempt to let them in,
// then they paid). Demo/partner orgs that are legitimately exempt have
// first_paid_at IS NULL and stay exempt.
async function clearTempBillingExempt(supabase: any, email: string) {
  const orgId = await findOrgByEmail(supabase, email);
  if (!orgId) return;
  const { data: org } = await supabase
    .from("organizations")
    .select("billing_exempt, first_paid_at")
    .eq("id", orgId)
    .maybeSingle();
  if (!org?.billing_exempt) return; // not exempt — nothing to clear
  if (!org?.first_paid_at) {
    // exempt but never paid — looks like a demo/partner, leave it
    logStep("billing_exempt left as-is (no first_paid_at, looks like demo)", { orgId });
    return;
  }
  const { error } = await supabase
    .from("organizations")
    .update({ billing_exempt: false })
    .eq("id", orgId);
  if (error) logStep("Failed to clear temp billing_exempt", { error: error.message });
  else logStep("Temp billing_exempt cleared after Stripe payment", { orgId });
}

async function clearPaymentFailed(supabase: any, email: string) {
  logStep("Clearing payment failure", { email });
  const orgId = await findOrgByEmail(supabase, email);
  if (!orgId) return;

  const { error } = await supabase
    .from("organizations")
    .update({ payment_failed_at: null })
    .eq("id", orgId);

  if (error) {
    logStep("Failed to clear payment failure", { error: error.message });
  } else {
    logStep("Payment failure cleared", { orgId });
  }
}
