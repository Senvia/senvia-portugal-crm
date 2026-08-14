import test from "node:test";
import assert from "node:assert/strict";
import {
  cycleMonth,
  monthlyRecurringRevenue,
  monthlyTotals,
  netRevenue,
  summarizeCycles,
  type CycleLike,
} from "./recurring-finance.ts";

const cycle = (over: Partial<CycleLike>): CycleLike => ({
  period_start: "2026-06-01",
  amount: 49,
  status: "pending",
  paid_at: null,
  ...over,
});

test("em competência, o ciclo pertence ao mês que cobre", () => {
  const june = cycle({ period_start: "2026-06-01", status: "paid", paid_at: "2026-07-09T10:00:00Z" });
  assert.equal(cycleMonth(june, "accrual"), "2026-06");
});

test("em recebimento, pertence ao mês em que o dinheiro entrou", () => {
  // O mesmo ciclo: junho por competência, julho por recebimento. É esta
  // diferença que fazia o mês nunca fechar quando se usava só uma data.
  const june = cycle({ period_start: "2026-06-01", status: "paid", paid_at: "2026-07-09T10:00:00Z" });
  assert.equal(cycleMonth(june, "cash"), "2026-07");
});

test("um ciclo por pagar não entra em recebimento", () => {
  assert.equal(cycleMonth(cycle({ status: "pending" }), "cash"), null);
});

test("dívida conta só o que já venceu", () => {
  // Um ciclo de dezembro não é dívida em agosto. Somar tudo o que não está pago
  // transformava a receita futura inteira em dívida.
  const totals = summarizeCycles(
    [
      cycle({ period_start: "2026-06-01", status: "paid" }),
      cycle({ period_start: "2026-07-01", status: "pending" }),
      cycle({ period_start: "2026-12-01", status: "pending" }),
    ],
    "2026-08-13",
  );
  assert.equal(totals.settled, 49);
  assert.equal(totals.outstanding, 49);
  assert.equal(totals.upcoming, 49);
  assert.equal(totals.billed, 147);
});

test("ciclos anulados não contam para nada", () => {
  const totals = summarizeCycles([cycle({ status: "void" })], "2026-08-13");
  assert.deepEqual(totals, { billed: 0, settled: 0, outstanding: 0, upcoming: 0 });
});

test("agrupa por mês na base escolhida", () => {
  const cycles = [
    cycle({ period_start: "2026-06-01", status: "paid", paid_at: "2026-07-09T00:00:00Z" }),
    cycle({ period_start: "2026-07-01", status: "paid", paid_at: "2026-07-20T00:00:00Z" }),
  ];
  assert.deepEqual(monthlyTotals(cycles, "accrual"), [
    { month: "2026-06", billed: 49, settled: 49 },
    { month: "2026-07", billed: 49, settled: 49 },
  ]);
  // Por recebimento, os dois caem em julho.
  assert.deepEqual(monthlyTotals(cycles, "cash"), [{ month: "2026-07", billed: 98, settled: 98 }]);
});

test("separa o que o cliente pagou do que entrou na conta", () => {
  const result = netRevenue([
    { amount: 49, stripe_gross_amount: 49, stripe_fee_amount: 1.33, stripe_net_amount: 47.67 },
    { amount: 54, stripe_gross_amount: 54, stripe_fee_amount: 1.44, stripe_net_amount: 52.56 },
  ]);
  assert.ok(Math.abs(result.gross - 103) < 0.001);
  assert.ok(Math.abs(result.fees - 2.77) < 0.001);
  assert.ok(Math.abs(result.net - 100.23) < 0.001);
});

test("pagamentos antigos sem decomposição contam pelo valor registado", () => {
  // Não se inventa uma taxa estimada: a taxa desconhecida conta zero.
  assert.deepEqual(netRevenue([{ amount: 49 }]), { gross: 49, fees: 0, net: 49 });
});

test("MRR soma apenas as recorrências com serviço activo", () => {
  const mrr = monthlyRecurringRevenue([
    { amount: 49, service_status: "active" },
    { amount: 54, service_status: "active" },
    { amount: 99, service_status: "cancelled" },
    { amount: 30, service_status: "paused" },
  ]);
  assert.equal(mrr, 103);
});
