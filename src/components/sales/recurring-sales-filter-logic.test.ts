import test from "node:test";
import assert from "node:assert/strict";

import {
  buildActivePaidTrafficSalesQuery,
  matchesRecurringSalesFilters,
  type RecurringSaleFilterCandidate,
  type RecurringSalesFilters,
} from "./recurring-sales-filter-logic.ts";

const defaultFilters: RecurringSalesFilters = {
  serviceStatus: "all",
  billingStatus: "all",
  billingProvider: "all",
  productId: "all",
};

const activePaidTraffic: RecurringSaleFilterCandidate = {
  hasRecurring: true,
  recurrence: {
    serviceStatus: "active",
    billingStatus: "past_due",
    billingProvider: "stripe",
  },
  recurringProductIds: ["product-paid-traffic"],
};

const inactivePaidTraffic: RecurringSaleFilterCandidate = {
  ...activePaidTraffic,
  recurrence: {
    serviceStatus: "inactive",
    billingStatus: "current",
    billingProvider: "stripe",
  },
};

test("Given an active sale with a failed charge, When service is active, Then it remains visible", () => {
  assert.equal(
    matchesRecurringSalesFilters(activePaidTraffic, {
      ...defaultFilters,
      serviceStatus: "active",
    }),
    true,
  );
  assert.equal(
    matchesRecurringSalesFilters(inactivePaidTraffic, {
      ...defaultFilters,
      serviceStatus: "active",
    }),
    false,
  );
});

test("Given active and current sales, When billing is past due, Then only the failed charge is found", () => {
  const currentSale: RecurringSaleFilterCandidate = {
    ...activePaidTraffic,
    recurrence: {
      serviceStatus: "active",
      billingStatus: "current",
      billingProvider: "stripe",
    },
  };

  const filters = { ...defaultFilters, billingStatus: "past_due" } satisfies RecurringSalesFilters;
  assert.equal(matchesRecurringSalesFilters(activePaidTraffic, filters), true);
  assert.equal(matchesRecurringSalesFilters(currentSale, filters), false);
});

test("Given manual and Stripe recurring sales, When provider is selected, Then only that provider matches", () => {
  const manualSale: RecurringSaleFilterCandidate = {
    ...activePaidTraffic,
    recurrence: {
      serviceStatus: "active",
      billingStatus: "current",
      billingProvider: "manual",
    },
  };

  const filters = { ...defaultFilters, billingProvider: "stripe" } satisfies RecurringSalesFilters;
  assert.equal(matchesRecurringSalesFilters(activePaidTraffic, filters), true);
  assert.equal(matchesRecurringSalesFilters(manualSale, filters), false);
});

test("Given a sale item id, When product is selected, Then notes text cannot make a sale match", () => {
  const filters = { ...defaultFilters, productId: "product-paid-traffic" } satisfies RecurringSalesFilters;
  assert.equal(matchesRecurringSalesFilters(activePaidTraffic, filters), true);
  assert.equal(
    matchesRecurringSalesFilters(
      { ...activePaidTraffic, recurringProductIds: ["product-other"] },
      filters,
    ),
    false,
  );
});

test("Given an organization and product id, When agents request paid traffic, Then the query is status and id based", () => {
  assert.deepEqual(buildActivePaidTrafficSalesQuery("org-1", "product-paid-traffic"), {
    organizationId: "org-1",
    serviceStatus: "active",
    productId: "product-paid-traffic",
  });
});
